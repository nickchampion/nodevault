import { eq } from 'drizzle-orm'
import type { ResponseInputItem } from 'openai/resources/responses/responses'
import { serverConfiguration } from '@platform/components.configuration.server'
import { decrypt } from '@platform/components.utils.server'
import { assets as assetsTable } from '@platform/components.nodevault.domain'
import type { Account } from '@platform/components.nodevault.domain'
import type { DatabaseClient } from '@platform/components.context'
import { createOpenAiClient } from '@platform/integrations.openai'
import type { AiClient, AiProviderAdapter } from './client.js'

export const OPENAI_NOT_CONFIGURED_MESSAGE = 'Connect your OpenAI API key in Settings to use vaults'

export const OPENAI_MIGRATING_MESSAGE = 'Your vaults are being moved to OpenAI — this only takes a few minutes'

export type OpenAiConfig = { apiKey: string, vectorStoreId: string }

export type OpenAiColumns = Pick<Account, 'openaiApiKey' | 'openaiVerifiedAtUTC' | 'openaiVectorStoreId' | 'openaiMigratingAtUTC'>

export const hasOpenAiAccess = (account: OpenAiColumns): boolean => (
  Boolean(account.openaiApiKey && account.openaiVerifiedAtUTC && account.openaiVectorStoreId) && !account.openaiMigratingAtUTC
)

export const openAiConfig = (account: OpenAiColumns): OpenAiConfig | null => {
  if (!account.openaiApiKey || !account.openaiVectorStoreId) return null

  const apiKey = decrypt(account.openaiApiKey, serverConfiguration.environment.key, serverConfiguration.environment.salt)

  return apiKey ? { apiKey, vectorStoreId: account.openaiVectorStoreId } : null
}

const buildOpenAiClient = (db: DatabaseClient, openai: OpenAiConfig): AiClient => {
  const client = createOpenAiClient({ apiKey: openai.apiKey })

  return {
    embedChunks: client.embedChunks,
    embedQuery: client.embedQuery,
    generateText: client.generateText,
    generateChunkContexts: client.generateChunkContexts,
    generateAnswerStream: client.generateAnswerStream,

    generateManagedAnswerStream: async function* (systemInstruction, history, question, vaultId, signal) {
      const input: ResponseInputItem[] = [
        ...history.map(message => ({
          role: (message.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: message.content,
        })),
        { role: 'user', content: question },
      ]

      yield* client.generateManagedAnswerStream(systemInstruction, input, openai.vectorStoreId, vaultId, signal)
    },

    mirrorAsset: async (asset) => {
      const existing = await db.query.assets.findFirst({
        columns: { openaiFileId: true },
        where: eq(assetsTable.id, asset.assetId),
      })

      const fileId = await client.upsertAssetFile(openai.vectorStoreId, { ...asset, existingFileId: existing?.openaiFileId ?? null })

      await db.update(assetsTable).set({ openaiFileId: fileId }).where(eq(assetsTable.id, asset.assetId))
    },

    deleteAssetMirror: async (_assetId, openaiFileId) => {
      if (!openaiFileId) return

      await client.deleteAssetFile(openai.vectorStoreId, openaiFileId)
    },
  }
}

export const openaiProvider: AiProviderAdapter<OpenAiColumns> = {
  hasAccess: hasOpenAiAccess,
  deniedMessage: account => (account.openaiMigratingAtUTC ? OPENAI_MIGRATING_MESSAGE : OPENAI_NOT_CONFIGURED_MESSAGE),
  buildClient: (db, account) => {
    const config = openAiConfig(account)

    return config ? buildOpenAiClient(db, config) : null
  },
}
