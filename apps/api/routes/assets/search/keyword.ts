import { and, desc, eq, sql } from 'drizzle-orm'
import { assetChunks, assets } from '@platform/components.domain'
import type { SearchStrategy } from './factory'

const RESULT_LIMIT = 10

export const keywordSearch: SearchStrategy = async (db, _gcp, vaultId, query) => {
  const tsQuery = sql`websearch_to_tsquery('english', ${query})`
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
