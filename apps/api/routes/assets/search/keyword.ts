import { and, desc, eq, sql } from 'drizzle-orm'
import { assetChunks, assets } from '@platform/components.domain'
import type { SearchStrategy } from './types.js'

const RESULT_LIMIT = 10

export const keywordSearch: SearchStrategy = async (db, vaultId, query) => {
  const tsQuery = sql`websearch_to_tsquery('english', ${query})`

  // normalization option 32 rescales rank to rank/(rank+1), bounding it to [0, 1) — otherwise
  // ts_rank_cd is unbounded and can exceed 1 for strong multi-term matches
  const rank = sql<number>`ts_rank_cd(${assetChunks.searchVector}, ${tsQuery}, 32)`

  const bestChunkPerAsset = db.$with('best_chunk_per_asset').as(
    db
      .selectDistinctOn([assets.id], {
        assetId: assets.id,
        assetName: assets.name,
        assetUrl: assets.url,
        source: assets.source,
        chunkIndex: assetChunks.chunkIndex,
        text: assetChunks.text,
        relevance: rank.as('relevance'),
      })
      .from(assetChunks)
      .innerJoin(assets, eq(assetChunks.assetId, assets.id))
      .where(and(eq(assets.vaultId, vaultId), sql`${assetChunks.searchVector} @@ ${tsQuery}`))
      .orderBy(assets.id, desc(rank)),
  )

  return db
    .with(bestChunkPerAsset)
    .select()
    .from(bestChunkPerAsset)
    .orderBy(desc(bestChunkPerAsset.relevance))
    .limit(RESULT_LIMIT)
}
