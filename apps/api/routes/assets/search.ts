import {
  and, cosineDistance, desc, eq, gt, isNotNull, sql,
} from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { SearchVaultRequest, SearchVaultResponse } from '@platform/components.contracts'
import { AppError, assetChunks, assets, vaults } from '@platform/components.domain'
import { createGeminiClient } from '@platform/integrations.gemini'

const RESULT_LIMIT = 10
const SIMILARITY_THRESHOLD = 0.5

export const assetsSearch: ApiHandler<SearchVaultRequest, SearchVaultResponse> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const { vaultId, query, type } = context.event.payload

  const vault = await context.session.db.query.vaults.findFirst({
    columns: { id: true },
    where: and(eq(vaults.id, vaultId), eq(vaults.accountId, accountId)),
  })

  if (!vault) return context.event.response.notFound()

  if (type === 'qa') {
    throw new AppError('validation', 'Q & A search is not available yet — try Document retrieval.')
  }

  const queryEmbedding = await createGeminiClient().embedQuery(query)

  const similarity = sql<number>`1 - (${cosineDistance(assetChunks.embedding, queryEmbedding)})`

  const bestChunkPerAsset = context.session.db
    .selectDistinctOn([assets.id], {
      assetId: assets.id,
      assetName: assets.name,
      assetUrl: assets.url,
      source: assets.source,
      chunkIndex: assetChunks.chunkIndex,
      text: assetChunks.text,
      similarity: similarity.as('similarity'),
    })
    .from(assetChunks)
    .innerJoin(assets, eq(assetChunks.assetId, assets.id))
    .where(and(
      eq(assets.vaultId, vaultId),
      isNotNull(assetChunks.embedding),
      gt(similarity, SIMILARITY_THRESHOLD),
    ))
    .orderBy(assets.id, desc(similarity))
    .as('best_chunk_per_asset')

  const rows = await context.session.db
    .select()
    .from(bestChunkPerAsset)
    .orderBy(desc(bestChunkPerAsset.similarity))
    .limit(RESULT_LIMIT)

  return context.event.response.ok({ type, results: rows })
}
