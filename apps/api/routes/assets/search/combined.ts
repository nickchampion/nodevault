import {
  and, cosineDistance, desc, eq, isNotNull, sql,
} from 'drizzle-orm'
import { assetChunks, assets } from '@platform/components.domain'
import { createGeminiClient } from '@platform/integrations.gemini'
import type { SearchStrategy } from './types.js'

const RESULT_LIMIT = 10

// candidate pool considered from each signal before fusion
const CANDIDATE_LIMIT = 50

// reciprocal rank fusion constant — dampens the influence of rank #1 vs #2 so one signal
// firing on an outlier doesn't dominate; 60 is the standard default from the RRF literature
const RRF_K = 60

// max possible fused score (rank 1 in both signals) — used to normalise relevance to 0-1
const RRF_MAX_SCORE = 2 / (RRF_K + 1)

// a chunk only enters the vector candidate pool if its similarity clears the vault's own
// noise floor for this query (mean + N stddev across the vault's chunks) — a fixed absolute
// cosine cutoff doesn't work here because unrelated chunks still commonly score ~0.5+
const VECTOR_STDDEV_MULTIPLIER = 1.5

export const combinedSearch: SearchStrategy = async (db, vaultId, query) => {
  const queryEmbedding = await createGeminiClient().embedQuery(query)

  const similarity = sql<number>`1 - (${cosineDistance(assetChunks.embedding, queryEmbedding)})`
  const tsQuery = sql`websearch_to_tsquery('english', ${query})`
  const textRank = sql<number>`ts_rank_cd(${assetChunks.searchVector}, ${tsQuery})`

  const vectorStats = db.$with('vector_stats').as(
    db
      .select({
        mean: sql<number>`avg(${similarity})`.as('mean'),
        stddev: sql<number>`coalesce(stddev(${similarity}), 0)`.as('stddev'),
      })
      .from(assetChunks)
      .innerJoin(assets, eq(assetChunks.assetId, assets.id))
      .where(and(eq(assets.vaultId, vaultId), isNotNull(assetChunks.embedding))),
  )

  const vectorMatches = db.$with('vector_matches').as(
    db
      .with(vectorStats)
      .select({
        chunkId: assetChunks.id,
        rank: sql<number>`row_number() over (order by ${similarity} desc)`.as('vector_rank'),
      })
      .from(assetChunks)
      .innerJoin(assets, eq(assetChunks.assetId, assets.id))
      .crossJoin(vectorStats)
      .where(and(
        eq(assets.vaultId, vaultId),
        isNotNull(assetChunks.embedding),
        sql`${similarity} > ${vectorStats.mean} + ${VECTOR_STDDEV_MULTIPLIER} * ${vectorStats.stddev}`,
      ))
      .orderBy(desc(similarity))
      .limit(CANDIDATE_LIMIT),
  )

  const textMatches = db.$with('text_matches').as(
    db
      .select({
        chunkId: assetChunks.id,
        rank: sql<number>`row_number() over (order by ${textRank} desc)`.as('text_rank'),
      })
      .from(assetChunks)
      .innerJoin(assets, eq(assetChunks.assetId, assets.id))
      .where(and(eq(assets.vaultId, vaultId), sql`${assetChunks.searchVector} @@ ${tsQuery}`))
      .orderBy(desc(textRank))
      .limit(CANDIDATE_LIMIT),
  )

  const fused = db.$with('fused').as(
    db
      .select({
        chunkId: sql<number>`coalesce(${vectorMatches.chunkId}, ${textMatches.chunkId})`.as('chunk_id'),
        // cast to float8 — plain division produces numeric, which node-postgres returns as a
        // string (to avoid precision loss), failing the `relevance: z.number()` contract
        score: sql<number>`(coalesce(1.0 / (${RRF_K} + ${vectorMatches.rank}), 0) + coalesce(1.0 / (${RRF_K} + ${textMatches.rank}), 0))::float8`.as('score'),
      })
      .from(vectorMatches)
      .fullJoin(textMatches, eq(vectorMatches.chunkId, textMatches.chunkId)),
  )

  const bestChunkPerAsset = db.$with('best_chunk_per_asset').as(
    db
      .with(vectorStats, vectorMatches, textMatches, fused)
      .selectDistinctOn([assets.id], {
        assetId: assets.id,
        assetName: assets.name,
        assetUrl: assets.url,
        source: assets.source,
        chunkIndex: assetChunks.chunkIndex,
        text: assetChunks.text,
        // normalised against the max possible fused score (rank 1 in both signals) so the
        // percentage reflects absolute signal strength, not just "best of this response"
        relevance: sql<number>`(${fused.score} / ${RRF_MAX_SCORE})::float8`.as('relevance'),
      })
      .from(fused)
      .innerJoin(assetChunks, eq(fused.chunkId, assetChunks.id))
      .innerJoin(assets, eq(assetChunks.assetId, assets.id))
      .orderBy(assets.id, desc(fused.score)),
  )

  return db
    .with(vectorStats, vectorMatches, textMatches, fused, bestChunkPerAsset)
    .select()
    .from(bestChunkPerAsset)
    .orderBy(desc(bestChunkPerAsset.relevance))
    .limit(RESULT_LIMIT)
}
