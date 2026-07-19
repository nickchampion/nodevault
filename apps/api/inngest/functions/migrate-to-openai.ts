import { NonRetriableError } from 'inngest'
import {
  and, asc, eq, isNotNull,
} from 'drizzle-orm'
import { serverConfiguration } from '@platform/components.configuration.server'
import { decrypt } from '@platform/components.utils.server'
import {
  accounts, assetChunks, assets, topics, users, vaults,
} from '@platform/components.nodevault.domain'
import { createOpenAiClient } from '@platform/integrations.openai'
import type { OpenAiClient } from '@platform/integrations.openai'
import { createVertexSearchClient } from '@platform/integrations.vertexsearch'
import { accountOpenaiConnectedEvent, inngest } from '../client.js'
import { withSession } from '../db.js'
import { invalidateAiAccount } from '../../ai.js'
import { platformGcpConfig } from '../../gcp.js'

/** The account's own (now-committed) OpenAI client + vector store id, or fail the run — there is nothing to migrate to without them. */
const ownOpenAi = async (accountId: number): Promise<{ client: OpenAiClient, vectorStoreId: string }> => {
  const account = await withSession(async db => db.query.accounts.findFirst({ where: eq(accounts.id, accountId) }))

  if (!account || account.aiProvider !== 'openai' || !account.openaiApiKey || !account.openaiVectorStoreId) {
    // switched back or credentials were removed between steps — retrying won't help
    throw new NonRetriableError(`Account ${accountId} has no OpenAI credentials to migrate to`)
  }

  const apiKey = decrypt(account.openaiApiKey, serverConfiguration.environment.key, serverConfiguration.environment.salt)

  if (!apiKey) throw new NonRetriableError(`Account ${accountId}'s OpenAI key failed to decrypt`)

  return { client: createOpenAiClient({ apiKey }), vectorStoreId: account.openaiVectorStoreId }
}

/**
 * account/openai.connected → the one-way Gemini-trial → OpenAI switch. Re-embeds every
 * ready asset's existing chunks through OpenAI (chunk text itself is provider-agnostic
 * and untouched — only the vector needs rebuilding), re-mirrors the asset into the
 * account's new OpenAI vector store, then removes the trial-era Vertex document. Also
 * re-embeds saved topics, since topic-match embeddings are provider-specific too.
 * Clears accounts.openaiMigratingAtUTC on completion so Settings drops the "migrating"
 * banner and the access gate (hasAiAccess) opens back up. Every step is idempotent
 * (chunk/topic embedding overwrite is safe to repeat, upsertAssetFile replaces any
 * previous file, Vertex delete swallows not-found), so retries and re-runs are safe.
 */
export const migrateToOpenai = inngest.createFunction(
  {
    id: 'migrate-to-openai',
    retries: 2,
    // one migration per account at a time; keep it gentle on the fresh key's rate limits
    concurrency: { limit: 1, key: 'event.data.accountId' },
    throttle: { limit: 6, period: '1m' },
    triggers: [accountOpenaiConnectedEvent],
  },
  async ({ event, step }) => {
    const { accountId } = event.data

    const assetIds = await step.run('list-ready-assets', () => withSession(async (db) => {
      const rows = await db
        .select({ id: assets.id })
        .from(assets)
        .innerJoin(vaults, eq(assets.vaultId, vaults.id))
        .where(and(eq(vaults.accountId, accountId), eq(assets.status, 'ready')))
        .orderBy(asc(assets.id))

      return rows.map(row => row.id)
    }))

    let migratedAssets = 0

    for (const assetId of assetIds) {
      const outcome = await step.run(`migrate-asset-${assetId}`, async () => {
        const { client, vectorStoreId } = await ownOpenAi(accountId)

        const source = await withSession(async (db) => {
          const row = await db.query.assets.findFirst({ where: eq(assets.id, assetId) })

          // deleted while the migration was running — nothing to move
          if (!row) return null

          const chunks = await db
            .select({ id: assetChunks.id, text: assetChunks.text })
            .from(assetChunks)
            .where(eq(assetChunks.assetId, assetId))
            .orderBy(asc(assetChunks.chunkIndex))

          return { row, chunks }
        })

        if (!source || source.chunks.length === 0) return 'skipped'

        const embeddings = await client.embedChunks(source.chunks.map(chunk => chunk.text))

        await withSession(async (db) => {
          for (const [index, chunk] of source.chunks.entries()) {
            await db.update(assetChunks)
              .set({ embedding: embeddings[index] })
              .where(eq(assetChunks.id, chunk.id))
          }
        })

        const fileId = await client.upsertAssetFile(vectorStoreId, {
          assetId,
          vaultId: source.row.vaultId,
          source: source.row.source,
          name: source.row.name,
          url: source.row.url,
          text: source.chunks.map(chunk => chunk.text).join('\n'),
          existingFileId: source.row.openaiFileId,
        })

        await withSession(async db => db.update(assets)
          .set({ openaiFileId: fileId })
          .where(eq(assets.id, assetId)))

        // remove the trial-era copy from the platform's Vertex data store (idempotent — not-found is fine)
        await createVertexSearchClient(platformGcpConfig()).deleteAssetDocument(assetId)

        return 'migrated'
      })

      if (outcome === 'migrated') migratedAssets += 1
    }

    const topicIds = await step.run('list-ready-topics', () => withSession(async (db) => {
      const rows = await db
        .select({ id: topics.id })
        .from(topics)
        .innerJoin(users, eq(topics.userId, users.id))
        .where(and(eq(users.accountId, accountId), eq(topics.status, 'ready'), isNotNull(topics.embedding)))
        .orderBy(asc(topics.id))

      return rows.map(row => row.id)
    }))

    let migratedTopics = 0

    for (const topicId of topicIds) {
      await step.run(`migrate-topic-${topicId}`, async () => {
        const { client } = await ownOpenAi(accountId)

        const row = await withSession(async db => db.query.topics.findFirst({ where: eq(topics.id, topicId) }))

        if (!row) return

        const embedding = await client.embedQuery(row.topic)

        await withSession(async db => db.update(topics)
          .set({ embedding, updatedAtUTC: new Date() })
          .where(eq(topics.id, topicId)))
      })

      migratedTopics += 1
    }

    await step.run('clear-migrating-flag', () => withSession(async db => db.update(accounts)
      .set({ openaiMigratingAtUTC: null, updatedAtUTC: new Date() })
      .where(eq(accounts.id, accountId))))

    await invalidateAiAccount(accountId)

    return {
      accountId, assets: assetIds.length, migratedAssets, topics: topicIds.length, migratedTopics,
    }
  },
)
