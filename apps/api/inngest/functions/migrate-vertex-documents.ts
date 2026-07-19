import { NonRetriableError } from 'inngest'
import { and, asc, eq } from 'drizzle-orm'
import { accounts, assetChunks, assets, vaults } from '@platform/components.nodevault.domain'
import { createVertexSearchClient } from '@platform/integrations.vertexsearch'
import type { GcpClientConfig } from '@platform/integrations.gemini'
import { accountGcpConnectedEvent, inngest } from '../client.js'
import { withSession } from '../db.js'
import { platformGcpConfig, toGcpConfig } from '../../gcp.js'

/** Own-credentials config for the account, or fail the run — there is nothing to migrate to without them. */
const ownGcpConfig = async (accountId: number): Promise<GcpClientConfig> => {
  const config = await withSession(async (db) => {
    const account = await db.query.accounts.findFirst({ where: eq(accounts.id, accountId) })

    return account ? toGcpConfig(account) : null
  })

  // credentials were removed/broken between steps — retrying won't help
  if (!config) throw new NonRetriableError(`Account ${accountId} has no verified GCP credentials to migrate to`)

  return config
}

/**
 * account/gcp.connected → move the account's Vertex AI Search documents from the
 * platform's data store (where trial-era ingestions were mirrored) into the account's
 * own store, so vertex-mode ask keeps finding sources after the switch. One step per
 * asset: rebuild the text from its stored chunks (concatenation re-includes the small
 * chunk overlaps — harmless for retrieval, same as the original backfill), upsert into
 * the account's store, then delete the platform copy. Both sides are idempotent
 * (imports are keyed on asset id, deletes swallow not-found), so retries and re-runs
 * are safe. Freshly imported documents take a few minutes to become searchable.
 */
export const migrateVertexDocuments = inngest.createFunction(
  {
    id: 'migrate-vertex-documents',
    retries: 2,
    // one migration per account at a time; keep imports gentle on the fresh project's quota
    concurrency: { limit: 1, key: 'event.data.accountId' },
    throttle: { limit: 6, period: '1m' },
    triggers: [accountGcpConnectedEvent],
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

    let migrated = 0

    for (const assetId of assetIds) {
      const outcome = await step.run(`migrate-asset-${assetId}`, async () => {
        const own = await ownGcpConfig(accountId)

        const source = await withSession(async (db) => {
          const row = await db.query.assets.findFirst({ where: eq(assets.id, assetId) })

          // deleted while the migration was running — nothing to move
          if (!row) return null

          const chunks = await db
            .select({ text: assetChunks.text })
            .from(assetChunks)
            .where(eq(assetChunks.assetId, assetId))
            .orderBy(asc(assetChunks.chunkIndex))

          return {
            vaultId: row.vaultId,
            source: row.source,
            name: row.name,
            url: row.url,
            text: chunks.map(chunk => chunk.text).join('\n'),
          }
        })

        if (!source || !source.text) return 'skipped'

        await createVertexSearchClient(own).upsertAssetDocument({
          assetId,
          vaultId: source.vaultId,
          source: source.source,
          name: source.name,
          url: source.url,
          text: source.text,
        })

        // remove the trial-era copy from the platform store (idempotent — not-found is fine)
        await createVertexSearchClient(platformGcpConfig()).deleteAssetDocument(assetId)

        return 'migrated'
      })

      if (outcome === 'migrated') migrated += 1
    }

    return { accountId, assets: assetIds.length, migrated }
  },
)
