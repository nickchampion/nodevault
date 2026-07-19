import { eq } from 'drizzle-orm'
import type { Content } from '@google/genai'
import type { ResponseInputItem } from 'openai/resources/responses/responses'
import { cache } from '@platform/components.cache'
import { serverConfiguration } from '@platform/components.configuration.server'
import { decrypt, encrypt } from '@platform/components.utils.server'
import {
  AppError, accounts, assets as assetsTable, vaults as vaultsTable,
} from '@platform/components.nodevault.domain'
import type { Account, AiProvider, ConversationMessage } from '@platform/components.nodevault.domain'
import type { DatabaseClient } from '@platform/components.context'
import { createGeminiClient } from '@platform/integrations.gemini'
import { assetIdFromDocumentPath, createVertexSearchClient, vaultFilter as vertexVaultFilter } from '@platform/integrations.vertexsearch'
import { createOpenAiClient } from '@platform/integrations.openai'
import {
  GCP_TRIAL_EXPIRED_MESSAGE, gcpForAccount, gcpForCleanup, hasGcpAccess,
} from './gcp.js'

export const OPENAI_NOT_CONFIGURED_MESSAGE = 'Connect your OpenAI API key in Settings to use vaults'

export const OPENAI_MIGRATING_MESSAGE = 'Your vaults are being moved to OpenAI — this only takes a few minutes'

/** The one field every asset mirror (Vertex document / OpenAI vector-store file) needs. */
export type AssetDocument = {
  assetId: number
  vaultId: number
  source: 'file' | 'url'
  name: string | null
  url: string | null
  text: string
}

/**
 * Provider-agnostic surface consumed by the ask pipeline and ingestion workflow —
 * built fresh per request/account from decrypted credentials, same rule as
 * createGeminiClient/createOpenAiClient below it. Gemini and OpenAI adapters live in
 * this file (not the integration packages) because only here is enough context
 * (db + which account) available to do the OpenAI branch's extra bookkeeping —
 * persisting the vector-store file id an upsert returns onto assets.openaiFileId,
 * since OpenAI assigns that id opaquely rather than letting us address it deterministically
 * the way Vertex's per-asset document id does.
 */
export type AiClient = {
  embedChunks: (texts: string[]) => Promise<number[][]>
  embedQuery: (text: string) => Promise<number[]>
  generateText: (prompt: string) => Promise<string>
  generateAnswerStream: (systemInstruction: string, prompt: string, signal?: AbortSignal) => AsyncGenerator<string>
  generateManagedAnswerStream: (
    systemInstruction: string, history: ConversationMessage[], question: string, vaultId: number, signal?: AbortSignal,
  ) => AsyncGenerator<{ text?: string, groundedAssetIds?: number[] }>
  mirrorAsset: (asset: AssetDocument) => Promise<void>
  // openaiFileId is whatever the caller already read off the assets row (about to be
  // deleted itself in every current call site, so there's nothing to persist back)
  deleteAssetMirror: (assetId: number, openaiFileId: string | null) => Promise<void>
}

const buildGeminiClient = (gcp: Parameters<typeof createGeminiClient>[0]): AiClient => {
  const gemini = createGeminiClient(gcp)
  const vertex = createVertexSearchClient(gcp)

  return {
    embedChunks: gemini.embedChunks,
    embedQuery: gemini.embedQuery,
    generateText: gemini.generateText,
    generateAnswerStream: gemini.generateAnswerStream,

    generateManagedAnswerStream: async function* (systemInstruction, history, question, vaultId, signal) {
      const contents: Content[] = [
        ...history.map(message => ({
          role: message.role === 'user' ? 'user' : 'model',
          parts: [{ text: message.content }],
        })),
        { role: 'user', parts: [{ text: question }] },
      ]

      const stream = gemini.generateGroundedAnswerStream(systemInstruction, contents, vertex.dataStorePath, vertexVaultFilter(vaultId), signal)

      for await (const part of stream) {
        const groundedAssetIds = (part.grounding?.groundingChunks ?? [])
          .map(chunk => assetIdFromDocumentPath(chunk.retrievedContext?.documentName))
          .filter((id): id is number => id !== undefined)

        yield { text: part.text, groundedAssetIds: groundedAssetIds.length > 0 ? groundedAssetIds : undefined }
      }
    },

    mirrorAsset: async asset => vertex.upsertAssetDocument(asset),

    deleteAssetMirror: async assetId => vertex.deleteAssetDocument(assetId),
  }
}

const buildOpenAiClient = (db: DatabaseClient, apiKey: string, vectorStoreId: string): AiClient => {
  const client = createOpenAiClient({ apiKey })

  return {
    embedChunks: client.embedChunks,
    embedQuery: client.embedQuery,
    generateText: client.generateText,
    generateAnswerStream: client.generateAnswerStream,

    generateManagedAnswerStream: async function* (systemInstruction, history, question, vaultId, signal) {
      const input: ResponseInputItem[] = [
        ...history.map(message => ({
          role: (message.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: message.content,
        })),
        { role: 'user', content: question },
      ]

      yield* client.generateManagedAnswerStream(systemInstruction, input, vectorStoreId, vaultId, signal)
    },

    mirrorAsset: async (asset) => {
      const existing = await db.query.assets.findFirst({
        columns: { openaiFileId: true },
        where: eq(assetsTable.id, asset.assetId),
      })

      const fileId = await client.upsertAssetFile(vectorStoreId, { ...asset, existingFileId: existing?.openaiFileId ?? null })

      await db.update(assetsTable).set({ openaiFileId: fileId }).where(eq(assetsTable.id, asset.assetId))
    },

    deleteAssetMirror: async (_assetId, openaiFileId) => {
      if (!openaiFileId) return

      await client.deleteAssetFile(vectorStoreId, openaiFileId)
    },
  }
}

export const encryptOpenAiKey = (apiKey: string): string => (
  encrypt(apiKey, serverConfiguration.environment.key, serverConfiguration.environment.salt)
)

const decryptOpenAiKey = (encrypted: string): string | null => (
  decrypt(encrypted, serverConfiguration.environment.key, serverConfiguration.environment.salt)
)

type AiAccountColumns = Pick<Account, 'aiProvider' | 'openaiApiKey' | 'openaiVerifiedAtUTC' | 'openaiVectorStoreId' | 'openaiMigratingAtUTC'>

/** Whether OpenAI-backed features are usable right now: own verified key, store created, not mid-migration. */
export const hasOpenAiAccess = (account: AiAccountColumns): boolean => (
  Boolean(account.openaiApiKey && account.openaiVerifiedAtUTC && account.openaiVectorStoreId) && !account.openaiMigratingAtUTC
)

/** Whether the account's chosen provider is usable right now — branches on aiProvider. */
export const hasAiAccess = (account: Account): boolean => (
  account.aiProvider === 'openai' ? hasOpenAiAccess(account) : hasGcpAccess(account)
)

const aiAccountCacheKey = (accountId: number) => `ai:account:${accountId}`

type AiAccountSnapshot = {
  aiProvider: AiProvider
  openaiApiKey: string | null
  openaiVerifiedAtUTC: string | null
  openaiVectorStoreId: string | null
  openaiMigratingAtUTC: string | null
}

/** Drop an account's cached AI-provider snapshot. Call from an afterCommit hook, same rule as invalidateGcpAccount. */
export const invalidateAiAccount = async (accountId: number): Promise<void> => cache.del(aiAccountCacheKey(accountId))

const loadAiAccountSnapshot = async (db: DatabaseClient, accountId: number): Promise<AiAccountSnapshot> => {
  const snapshot = await cache.get<AiAccountSnapshot>(
    aiAccountCacheKey(accountId),
    async () => {
      const account = await db.query.accounts.findFirst({
        columns: {
          aiProvider: true, openaiApiKey: true, openaiVerifiedAtUTC: true, openaiVectorStoreId: true, openaiMigratingAtUTC: true,
        },
        where: eq(accounts.id, accountId),
      })

      if (!account) return null

      return {
        aiProvider: account.aiProvider,
        openaiApiKey: account.openaiApiKey,
        openaiVerifiedAtUTC: account.openaiVerifiedAtUTC ? account.openaiVerifiedAtUTC.toISOString() : null,
        openaiVectorStoreId: account.openaiVectorStoreId,
        openaiMigratingAtUTC: account.openaiMigratingAtUTC ? account.openaiMigratingAtUTC.toISOString() : null,
      }
    },
    serverConfiguration.cache.timeouts.fifteenMinutes,
  )

  if (!snapshot) throw new AppError('not-found', `Account ${accountId} not found`)

  return snapshot
}

/**
 * Resolves the AI client an account's requests should run against: branches on
 * aiProvider first (an OpenAI-track account must never fall back to a Gemini trial,
 * even inside what would otherwise still be its 7-day trial window), then delegates to
 * gcpForAccount for the Gemini branch (own credentials, or the platform trial) so that
 * logic isn't duplicated here.
 */
export const aiClientForAccount = async (db: DatabaseClient, accountId: number): Promise<AiClient> => {
  const snapshot = await loadAiAccountSnapshot(db, accountId)

  if (snapshot.aiProvider === 'openai') {
    if (snapshot.openaiMigratingAtUTC) throw new AppError('validation', OPENAI_MIGRATING_MESSAGE)

    if (!snapshot.openaiApiKey || !snapshot.openaiVerifiedAtUTC || !snapshot.openaiVectorStoreId) {
      throw new AppError('validation', OPENAI_NOT_CONFIGURED_MESSAGE)
    }

    const apiKey = decryptOpenAiKey(snapshot.openaiApiKey)

    if (!apiKey) throw new AppError('validation', OPENAI_NOT_CONFIGURED_MESSAGE)

    return buildOpenAiClient(db, apiKey, snapshot.openaiVectorStoreId)
  }

  const gcp = await gcpForAccount(db, accountId)

  return buildGeminiClient(gcp)
}

export const aiClientForVault = async (db: DatabaseClient, vaultId: number): Promise<AiClient> => {
  const vault = await db.query.vaults.findFirst({
    columns: { accountId: true },
    where: eq(vaultsTable.id, vaultId),
  })

  if (!vault) throw new AppError('not-found', `Vault ${vaultId} not found`)

  return aiClientForAccount(db, vault.accountId)
}

export const aiClientForAsset = async (db: DatabaseClient, assetId: number): Promise<AiClient> => {
  const asset = await db.query.assets.findFirst({
    columns: { vaultId: true },
    where: eq(assetsTable.id, assetId),
  })

  if (!asset) throw new AppError('not-found', `Asset ${assetId} not found`)

  return aiClientForVault(db, asset.vaultId)
}

/**
 * AI client for cleanup work (deleting mirrored documents/files) from an already-loaded
 * account row — mirrors gcpForCleanup, branching on aiProvider. Returns null only when
 * the account has nothing to clean up (OpenAI chosen but never actually finished
 * connecting, which the one-way switch shouldn't leave possible, but the type stays
 * defensive to match the existing gcpForCleanup call-site pattern).
 */
export const aiClientForCleanup = (db: DatabaseClient, account: Account): AiClient | null => {
  if (account.aiProvider === 'openai') {
    if (!account.openaiApiKey || !account.openaiVectorStoreId) return null

    const apiKey = decryptOpenAiKey(account.openaiApiKey)

    return apiKey ? buildOpenAiClient(db, apiKey, account.openaiVectorStoreId) : null
  }

  return buildGeminiClient(gcpForCleanup(account))
}

/** The message to show when hasAiAccess(account) is false — picks the reason that actually applies. */
export const aiAccessDeniedMessage = (account: Account): string => {
  if (account.aiProvider !== 'openai') return GCP_TRIAL_EXPIRED_MESSAGE

  return account.openaiMigratingAtUTC ? OPENAI_MIGRATING_MESSAGE : OPENAI_NOT_CONFIGURED_MESSAGE
}
