import type { GetStepTools } from 'inngest'
import {
  and, eq, gte, isNotNull, lt,
} from 'drizzle-orm'
import { chunkText, partition } from '@platform/components.utils'
import {
  assetChunks, assets, topicMatches, topics, users, vaults,
} from '@platform/components.nodevault.domain'
import type { VaultAsset } from '@platform/components.nodevault.domain'
import { createGeminiClient, embeddingBatchSize } from '@platform/integrations.gemini'
import { createVertexSearchClient } from '@platform/integrations.vertexsearch'
import { createResendClient } from '@platform/integrations.resend'
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

// a topic "touches on" new content once its embedding clears this cosine-similarity bar
// against the asset's best chunk — a fixed cutoff (rather than the search noise-floor
// stats in candidates.ts) since a single new asset rarely has enough chunks for a
// meaningful mean/stddev, and there's no query to rank candidates against here, just one
// fixed embedding to test. Tune once real topics/content are in use.
const TOPIC_MATCH_THRESHOLD = 0.6

const cosineSimilarity = (a: number[], b: number[]): number => {
  let dot = 0

  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]

  // embeddings are already unit-normalised by createGeminiClient, so the dot product
  // alone equals cosine similarity — no need to divide by magnitudes
  return dot
}

/** The asset's own chunk that best matches a topic's embedding. */
const bestMatchingChunk = (
  topicEmbedding: number[],
  chunks: Array<{ id: number, embedding: number[] | null }>,
): { chunkId: number, similarity: number } => {
  let best = { chunkId: chunks[0].id, similarity: -1 }

  for (const chunk of chunks) {
    if (!chunk.embedding) continue

    const similarity = cosineSimilarity(topicEmbedding, chunk.embedding)

    if (similarity > best.similarity) best = { chunkId: chunk.id, similarity }
  }

  return best
}

/**
 * Check a newly-ready asset against every ready topic saved by a user on the same
 * account, and email each user whose topic newly matched. Runs as the final step of
 * process-url-asset.ts / process-file-asset.ts once chunks + embeddings exist. Matches
 * are recorded in topic_matches (unique on topic+asset) so retries/re-runs never send a
 * duplicate email — only topics that were actually newly inserted trigger a send.
 */
export const matchTopics = async (step: Step, assetId: number): Promise<void> => {
  await step.run('match-topics', async () => {
    const newMatches = await withSession(async (db) => {
      const asset = await db.query.assets.findFirst({ where: eq(assets.id, assetId) })

      if (!asset) return []

      const vault = await db.query.vaults.findFirst({
        columns: { accountId: true },
        where: eq(vaults.id, asset.vaultId),
      })

      if (!vault) return []

      const chunks = await db
        .select({ id: assetChunks.id, embedding: assetChunks.embedding })
        .from(assetChunks)
        .where(and(eq(assetChunks.assetId, assetId), isNotNull(assetChunks.embedding)))

      if (chunks.length === 0) return []

      const accountTopics = await db
        .select({
          id: topics.id, topic: topics.topic, embedding: topics.embedding, userEmail: users.email,
        })
        .from(topics)
        .innerJoin(users, eq(topics.userId, users.id))
        .where(and(
          eq(users.accountId, vault.accountId),
          eq(topics.status, 'ready'),
          isNotNull(topics.embedding),
        ))

      const inserted: Array<{ userEmail: string, topic: string }> = []

      for (const candidate of accountTopics) {
        if (!candidate.embedding) continue

        const best = bestMatchingChunk(candidate.embedding, chunks)

        if (best.similarity < TOPIC_MATCH_THRESHOLD) continue

        const [match] = await db.insert(topicMatches)
          .values({
            topicId: candidate.id, assetId, chunkId: best.chunkId, similarity: best.similarity,
          })
          .onConflictDoNothing()
          .returning()

        if (match) inserted.push({ userEmail: candidate.userEmail, topic: candidate.topic })
      }

      return inserted
    })

    if (newMatches.length === 0) return

    const asset = await withSession(async db => db.query.assets.findFirst({ where: eq(assets.id, assetId) }))

    if (!asset) return

    const byUser = new Map<string, string[]>()

    for (const match of newMatches) {
      const matchedTopics = byUser.get(match.userEmail) ?? []

      matchedTopics.push(match.topic)
      byUser.set(match.userEmail, matchedTopics)
    }

    for (const [email, matchedTopics] of byUser) {
      try {
        const resend = createResendClient()

        const html = await resend.render('/emails/topic-matched', {
          topics: matchedTopics.join(', '),
          assetName: asset.name ?? asset.url ?? 'New content',
          vaultId: String(asset.vaultId),
        })

        await resend.send({
          to: email,
          subject: `New content matches "${matchedTopics[0]}"`,
          html,
        })
      } catch (error) {
        // a failed alert email should not fail the ingestion workflow
        console.error('Failed to send topic-matched email', error)
      }
    }
  })
}
