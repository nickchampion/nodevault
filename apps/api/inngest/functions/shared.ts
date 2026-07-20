import type { GetStepTools } from 'inngest'
import {
  and, eq, gte, isNotNull, lt,
} from 'drizzle-orm'
import { chunkText, partition } from '@platform/components.utils'
import {
  assetChunks, assets, topicMatches, topics, users, vaults,
} from '@platform/components.nodevault.domain'
import type { VaultAsset } from '@platform/components.nodevault.domain'
import { embeddingBatchSize } from '@platform/integrations.gemini'
import { createResendClient } from '@platform/integrations.resend'
import { inngest } from '../client.js'
import { withSession } from '../../utils/db.js'
import { aiClientForAsset, aiClientForVault } from '../../utils/ai/client.js'

type Step = GetStepTools<typeof inngest>

export const loadAndMarkProcessing = <T>(
  step: Step,
  assetId: number,
  validate: (row: VaultAsset) => T,
) => step.run('load-and-validate', () => withSession(async (db) => {
  const row = await db.query.assets.findFirst({ where: eq(assets.id, assetId) })

  if (!row) throw new Error(`Asset ${assetId} is not visible yet`)

  if (row.status === 'ready') return null

  const validated = validate(row)

  await db.update(assets)
    .set({ status: 'processing', error: null, updatedAtUTC: new Date() })
    .where(eq(assets.id, assetId))

  return validated
}))

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

      const ai = await withSession(async db => aiClientForAsset(db, assetId))
      const embeddings = await ai.embedChunks(rows.map(row => row.text))

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
 * Mirror the extracted text into the account's managed retrieval store (Vertex AI
 * Search for Gemini accounts, an OpenAI vector store for OpenAI accounts) — the
 * retrieval source for managed-mode ask answers. The upsert is idempotent, keyed on the
 * asset id; the alternate retrieval stack (chunks + pgvector) is populated by
 * storeChunks/embedChunks from the same extraction. Indexing can lag a few minutes
 * behind an asset turning ready.
 */
export const mirrorToManagedIndex = async (step: Step, assetId: number, content: string, patch: Partial<Pick<VaultAsset, 'name'>> = {}): Promise<void> => {
  await step.run('mirror-to-managed-index', async () => {
    const { row, ai } = await withSession(async (db) => {
      const asset = await db.query.assets.findFirst({ where: eq(assets.id, assetId) })

      if (!asset) throw new Error(`Asset ${assetId} disappeared before managed-index mirror`)

      return { row: asset, ai: await aiClientForVault(db, asset.vaultId) }
    })

    await ai.mirrorAsset({
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

export const markFailed = async (assetId: number, message: string): Promise<void> => {
  await withSession(async db => db.update(assets)
    .set({ status: 'failed', error: message.slice(0, 1000), updatedAtUTC: new Date() })
    .where(eq(assets.id, assetId)))
}

const TOPIC_MATCH_THRESHOLD = 0.6

const cosineSimilarity = (a: number[], b: number[]): number => {
  let dot = 0

  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]

  return dot
}

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
        console.error('Failed to send topic-matched email', error)
      }
    }
  })
}
