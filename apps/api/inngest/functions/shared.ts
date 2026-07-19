import type { GetStepTools } from 'inngest'
import { and, eq, gte, lt } from 'drizzle-orm'
import { chunkText, partition } from '@platform/components.utils'
import { assetChunks, assets } from '@platform/components.domain'
import type { VaultAsset } from '@platform/components.domain'
import { createGeminiClient, embeddingBatchSize } from '@platform/integrations.gemini'
import { createVertexSearchClient } from '@platform/integrations.vertexsearch'
import { inngest } from '../client.js'
import { withSession } from '../db.js'
import { gcpForAsset, gcpForVault } from '../../gcp.js'

type Step = GetStepTools<typeof inngest>

/**
 * Load the asset row and mark it processing, both in one session — there's nothing slow
 * between the read and the write, so one transaction keeps it atomic and saves a round
 * trip over two. `validate` throws for a row this workflow can't handle (bad content
 * type, missing URL, ...) and otherwise returns whatever the extraction step needs.
 * Returns null for an asset already marked ready (duplicate event delivery) so the
 * caller can skip the rest of the run.
 */
export const loadAndMarkProcessing = <T>(
  step: Step,
  assetId: number,
  validate: (row: VaultAsset) => T,
) => step.run('load-and-validate', () => withSession(async (db) => {
  const row = await db.query.assets.findFirst({ where: eq(assets.id, assetId) })

  // the creating transaction commits after the event is sent — retry until the row is visible
  if (!row) throw new Error(`Asset ${assetId} is not visible yet`)

  // duplicate delivery of an already processed asset — nothing to do
  if (row.status === 'ready') return null

  const validated = validate(row)

  await db.update(assets)
    .set({ status: 'processing', error: null, updatedAtUTC: new Date() })
    .where(eq(assets.id, assetId))

  return validated
}))

/** Replace an asset's chunks wholesale so retries and re-runs stay idempotent. */
export const storeChunks = async (step: Step, assetId: number, content: string): Promise<number> => step.run('store-chunks', async () => {
  const chunks = chunkText(content)
  const rows = chunks.map((text, chunkIndex) => ({ assetId, chunkIndex, text }))

  await withSession(async (db) => {
    await db.delete(assetChunks).where(eq(assetChunks.assetId, assetId))

    for (const group of partition(rows, 500)) {
      await db.insert(assetChunks).values(group)
    }
  })

  return chunks.length
})

/**
 * One step per batch: a Gemini rate limit only retries its own batch, and completed
 * batches are memoised across retries. The select and the update each get their own
 * session, kept deliberately separate either side of the Gemini call so no DB
 * transaction — and pooled connection — sits open across a slow external request.
 */
export const embedChunks = async (step: Step, assetId: number, chunkCount: number): Promise<void> => {
  const batches = Math.ceil(chunkCount / embeddingBatchSize)

  for (let batch = 0; batch < batches; batch++) {
    await step.run(`embed-batch-${batch}`, async () => {
      const start = batch * embeddingBatchSize

      const rows = await withSession(async db => db
        .select({ id: assetChunks.id, text: assetChunks.text })
        .from(assetChunks)
        .where(and(
          eq(assetChunks.assetId, assetId),
          gte(assetChunks.chunkIndex, start),
          lt(assetChunks.chunkIndex, start + embeddingBatchSize),
        ))
        .orderBy(assetChunks.chunkIndex))

      if (rows.length === 0) return

      // per-account GCP: embeddings run in the vault owner's own project
      const gcp = await withSession(async db => gcpForAsset(db, assetId))

      const embeddings = await createGeminiClient(gcp).embedChunks(rows.map(row => row.text))

      await withSession(async (db) => {
        for (const [index, row] of rows.entries()) {
          await db.update(assetChunks)
            .set({ embedding: embeddings[index] })
            .where(eq(assetChunks.id, row.id))
        }
      })
    })
  }
}

/**
 * Mirror the extracted text into the Vertex AI Search data store (the retrieval source
 * for vertex-mode ask answers). The import is an idempotent upsert keyed on the asset
 * id; the alternate retrieval stack (chunks + pgvector) is populated by storeChunks/
 * embedChunks from the same extraction. Vertex indexing lags a few minutes behind an
 * asset turning ready.
 */
export const mirrorToVertexSearch = async (step: Step, assetId: number, content: string, patch: Partial<Pick<VaultAsset, 'name'>> = {}): Promise<void> => {
  await step.run('mirror-to-vertex-search', async () => {
    const { row, gcp } = await withSession(async (db) => {
      const asset = await db.query.assets.findFirst({ where: eq(assets.id, assetId) })

      if (!asset) throw new Error(`Asset ${assetId} disappeared before Vertex mirror`)

      return { row: asset, gcp: await gcpForVault(db, asset.vaultId) }
    })

    await createVertexSearchClient(gcp).upsertAssetDocument({
      assetId,
      vaultId: row.vaultId,
      source: row.source,
      name: patch.name ?? row.name,
      url: row.url,
      text: content,
    })
  })
}

export const markReady = async (step: Step, assetId: number, patch: Partial<Pick<VaultAsset, 'name'>> = {}): Promise<void> => {
  await step.run('mark-ready', () => withSession(async db => db.update(assets)
    .set({
      status: 'ready', error: null, updatedAtUTC: new Date(), ...patch,
    })
    .where(eq(assets.id, assetId))))
}

/** Shared by both functions' onFailure — runs outside the step/replay machinery, so no step.run. */
export const markFailed = async (assetId: number, message: string): Promise<void> => {
  await withSession(async db => db.update(assets)
    .set({ status: 'failed', error: message.slice(0, 1000), updatedAtUTC: new Date() })
    .where(eq(assets.id, assetId)))
}
