import {
  and, cosineDistance, desc, eq, isNotNull, sql,
} from 'drizzle-orm'
import { assetChunks, assets } from '@platform/components.domain'
import { createGeminiClient } from '@platform/integrations.gemini'
import type { SearchStrategy } from './types.js'

const RESULT_LIMIT = 10

// a chunk only qualifies if its similarity clears the vault's own noise floor for this query
// (mean + N stddev across the vault's chunks) — a fixed absolute cosine cutoff doesn't work
// here because unrelated chunks commonly still score ~0.5+, so an unrelated query would
// otherwise return a full top-K of "best of the noise" instead of nothing
const STDDEV_MULTIPLIER = 1.5

export const semanticSearch: SearchStrategy = async (db, vaultId, query) => {
  const queryEmbedding = await createGeminiClient().embedQuery(query)

  const similarity = sql<number>`1 - (${cosineDistance(assetChunks.embedding, queryEmbedding)})`

  const stats = db.$with('vector_stats').as(
    db
      .select({
        mean: sql<number>`avg(${similarity})`.as('mean'),
        stddev: sql<number>`coalesce(stddev(${similarity}), 0)`.as('stddev'),
      })
      .from(assetChunks)
      .innerJoin(assets, eq(assetChunks.assetId, assets.id))
      .where(and(eq(assets.vaultId, vaultId), isNotNull(assetChunks.embedding))),
  )

  const bestChunkPerAsset = db.$with('best_chunk_per_asset').as(
    db
      .with(stats)
      .selectDistinctOn([assets.id], {
        assetId: assets.id,
        assetName: assets.name,
        assetUrl: assets.url,
        source: assets.source,
        chunkIndex: assetChunks.chunkIndex,
        text: assetChunks.text,
        relevance: similarity.as('relevance'),
      })
      .from(assetChunks)
      .innerJoin(assets, eq(assetChunks.assetId, assets.id))
      .crossJoin(stats)
      .where(and(
        eq(assets.vaultId, vaultId),
        isNotNull(assetChunks.embedding),
        sql`${similarity} > ${stats.mean} + ${STDDEV_MULTIPLIER} * ${stats.stddev}`,
      ))
      .orderBy(assets.id, desc(similarity)),
  )

  return db
    .with(stats, bestChunkPerAsset)
    .select()
    .from(bestChunkPerAsset)
    .orderBy(desc(bestChunkPerAsset.relevance))
    .limit(RESULT_LIMIT)
}
