import { eq } from 'drizzle-orm'
import { cache } from '@platform/components.cache'
import { serverConfiguration } from '@platform/components.configuration.server'
import {
  AppError, accounts, assets as assetsTable, vaults as vaultsTable,
} from '@platform/components.nodevault.domain'
import type { Account, ConversationMessage } from '@platform/components.nodevault.domain'
import type { DatabaseClient } from '@platform/components.context'
import { geminiProvider } from './gcp.js'
import type { GcpColumns } from './gcp.js'
import { openaiProvider } from './openai.js'
import type { OpenAiColumns } from './openai.js'

export type AssetDocument = {
  assetId: number
  vaultId: number
  source: 'file' | 'url'
  name: string | null
  url: string | null
  text: string
}

export type AiClient = {
  embedChunks: (texts: string[]) => Promise<number[][]>
  embedQuery: (text: string) => Promise<number[]>
  generateText: (prompt: string) => Promise<string>

  /**
   * Contextual Retrieval: generate a situating context for each chunk of one document. The
   * `documentPreamble` is identical for every chunk, so providers prompt-cache it and re-bill
   * only each `chunkInstruction`. Returns one context per instruction, aligned by index, with
   * null where an individual chunk failed to generate.
   */
  generateChunkContexts: (documentPreamble: string, chunkInstructions: string[]) => Promise<(string | null)[]>
  generateAnswerStream: (systemInstruction: string, prompt: string, signal?: AbortSignal) => AsyncGenerator<string>
  generateManagedAnswerStream: (
    systemInstruction: string, history: ConversationMessage[], question: string, vaultId: number, signal?: AbortSignal,
  ) => AsyncGenerator<{ text?: string, groundedAssetIds?: number[] }>
  mirrorAsset: (asset: AssetDocument) => Promise<void>
  deleteAssetMirror: (assetId: number, openaiFileId: string | null) => Promise<void>
}

export type AiProviderAdapter<TAccount> = {
  hasAccess: (account: TAccount) => boolean
  deniedMessage: (account: TAccount) => string
  buildClient: (db: DatabaseClient, account: TAccount) => AiClient | null
}

const providerFor = (account: Pick<Account, 'aiProvider'>): AiProviderAdapter<GcpColumns> | AiProviderAdapter<OpenAiColumns> => (
  account.aiProvider === 'openai' ? openaiProvider : geminiProvider
)

export const hasAiAccess = (account: Account): boolean => providerFor(account).hasAccess(account)

export const aiAccessDeniedMessage = (account: Account): string => providerFor(account).deniedMessage(account)

const aiAccountCacheKey = (accountId: number) => `ai:account:${accountId}`

type AiAccountColumns = Pick<Account,
  'aiProvider' | 'gcpProjectId' | 'gcpLocation' | 'gcpCredentials' | 'gcpVerifiedAtUTC' | 'createdAtUTC'
  | 'openaiApiKey' | 'openaiVerifiedAtUTC' | 'openaiVectorStoreId' | 'openaiMigratingAtUTC'
>

export const invalidateAiAccount = async (accountId: number): Promise<void> => cache.del(aiAccountCacheKey(accountId))

const loadAiAccount = async (db: DatabaseClient, accountId: number): Promise<AiAccountColumns> => {
  const cached = await cache.get<AiAccountColumns>(
    aiAccountCacheKey(accountId),
    async () => {
      const account = await db.query.accounts.findFirst({
        columns: {
          aiProvider: true,
          gcpProjectId: true,
          gcpLocation: true,
          gcpCredentials: true,
          gcpVerifiedAtUTC: true,
          createdAtUTC: true,
          openaiApiKey: true,
          openaiVerifiedAtUTC: true,
          openaiVectorStoreId: true,
          openaiMigratingAtUTC: true,
        },
        where: eq(accounts.id, accountId),
      })

      return account ?? null
    },
    serverConfiguration.cache.timeouts.fifteenMinutes,
  )

  if (!cached) throw new AppError('not-found', `Account ${accountId} not found`)

  return {
    ...cached,
    gcpVerifiedAtUTC: cached.gcpVerifiedAtUTC ? new Date(cached.gcpVerifiedAtUTC) : null,
    createdAtUTC: new Date(cached.createdAtUTC),
    openaiVerifiedAtUTC: cached.openaiVerifiedAtUTC ? new Date(cached.openaiVerifiedAtUTC) : null,
    openaiMigratingAtUTC: cached.openaiMigratingAtUTC ? new Date(cached.openaiMigratingAtUTC) : null,
  }
}

export const aiClientForAccount = async (db: DatabaseClient, accountId: number): Promise<AiClient> => {
  const account = await loadAiAccount(db, accountId)
  const provider = providerFor(account)

  if (!provider.hasAccess(account)) throw new AppError('validation', provider.deniedMessage(account))

  const client = provider.buildClient(db, account)

  if (!client) throw new AppError('validation', provider.deniedMessage(account))

  return client
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

export const aiClientForCleanup = (db: DatabaseClient, account: Account): AiClient | null => (
  providerFor(account).buildClient(db, account)
)
