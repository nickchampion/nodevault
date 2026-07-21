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
import type { AiClient } from '../../utils/ai/client.js'
import { chunkContextInstruction, documentContextPreamble } from '../../ask/prompts.js'

type Step = GetStepTools<typeof inngest>

/**
 * Contextual Retrieval master switch. When off, chunks embed from their raw text (context
 * stays null) — the retrieval side transparently falls back. Off is also the correct baseline
 * to record in the eval harness before turning it on and re-ingesting.
 */
export const CONTEXTUAL_CHUNKS_ENABLED = true

// how many chunks get a context blurb per step — one LLM call each, so keep batches modest to
// bound step duration and stay under the account's per-minute generation limits
const CONTEXT_BATCH_SIZE = 8

// characters of the parent document fed to the context model; a full book per chunk would be
// wasteful — the model only needs enough surrounding material to situate the chunk
const CONTEXT_DOCUMENT_CHAR_LIMIT = 12_000

/**
 * The text that actually gets embedded / full-text indexed for a chunk: its situating context
 * (when present) prepended to the chunk body. Shared by ingestion and the backfill so both
 * embed exactly what search_vector is generated from. The answer prompt still shows the raw
 * chunk text — context only steers retrieval.
 */
export const embeddingInput = (text: string, context: string | null): string => (context ? `${context}\n\n${text}` : text)

/**
 * Generate a one/two-sentence situating context for each chunk against its parent document.
 * The document preamble is shared across the batch and prompt-cached by the provider, so the
 * (large, identical) document tokens are billed once rather than once per chunk. A failed
 * chunk comes back null and simply embeds from its raw text.
 */
export const buildChunkContexts = async (
  ai: AiClient,
  document: string,
  chunks: Array<{ id: number, text: string }>,
): Promise<Array<{ id: number, context: string | null }>> => {
  const preamble = documentContextPreamble(document.slice(0, CONTEXT_DOCUMENT_CHAR_LIMIT))
  const contexts = await ai.generateChunkContexts(preamble, chunks.map(chunk => chunkContextInstruction(chunk.text)))

  return chunks.map((chunk, index) => ({ id: chunk.id, context: contexts[index] ?? null }))
}

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

/**
 * Contextual Retrieval, ingestion path: give each chunk a short blurb situating it within the
 * full document (passed straight through from extraction), stored in asset_chunks.context.
 * Runs before embedChunks so embeddings (and the generated search_vector) pick the context up.
 * A no-op when the feature is off. Chunks are addressed by their contiguous chunkIndex range.
 */
export const contextualiseChunks = async (step: Step, assetId: number, document: string, chunkCount: number): Promise<void> => {
  if (!CONTEXTUAL_CHUNKS_ENABLED) return

  const batches = Math.ceil(chunkCount / CONTEXT_BATCH_SIZE)

  for (let batch = 0; batch < batches; batch++) {
    await step.run(`contextualise-batch-${batch}`, async () => {
      const start = batch * CONTEXT_BATCH_SIZE

      const rows = await withSession(async db => db
        .select({ id: assetChunks.id, text: assetChunks.text })
        .from(assetChunks)
        .where(and(
          eq(assetChunks.assetId, assetId),
          gte(assetChunks.chunkIndex, start),
          lt(assetChunks.chunkIndex, start + CONTEXT_BATCH_SIZE),
        ))
        .orderBy(assetChunks.chunkIndex))

      if (rows.length === 0) return

      const ai = await withSession(async db => aiClientForAsset(db, assetId))
      const contexts = await buildChunkContexts(ai, document, rows)

      await withSession(async (db) => {
        for (const { id, context } of contexts) {
          await db.update(assetChunks).set({ context }).where(eq(assetChunks.id, id))
        }
      })
    })
  }
}

export const embedChunks = async (step: Step, assetId: number, chunkCount: number): Promise<void> => {
  const batches = Math.ceil(chunkCount / embeddingBatchSize)

  for (let batch = 0; batch < batches; batch++) {
    await step.run(`embed-batch-${batch}`, async () => {
      const start = batch * embeddingBatchSize

      const rows = await withSession(async db => db
        .select({ id: assetChunks.id, text: assetChunks.text, context: assetChunks.context })
        .from(assetChunks)
        .where(and(
          eq(assetChunks.assetId, assetId),
          gte(assetChunks.chunkIndex, start),
          lt(assetChunks.chunkIndex, start + embeddingBatchSize),
        ))
        .orderBy(assetChunks.chunkIndex))

      if (rows.length === 0) return

      const ai = await withSession(async db => aiClientForAsset(db, assetId))
      const embeddings = await ai.embedChunks(rows.map(row => embeddingInput(row.text, row.context)))

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
