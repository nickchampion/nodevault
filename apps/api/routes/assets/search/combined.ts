import type { SearchResultDto } from '@platform/components.nodevault.contracts'
import type { SearchStrategy } from './factory.js'
import { CANDIDATE_LIMIT, hybridChunkCandidates } from './candidates.js'

const RESULT_LIMIT = 10

export const combinedSearch: SearchStrategy = async (db, ai, vaultId, query) => {
  const queryEmbedding = await ai.embedQuery(query)
  const candidates = await hybridChunkCandidates(db, vaultId, query, queryEmbedding, CANDIDATE_LIMIT)

  // candidates arrive relevance-ordered, so the first chunk seen per asset is its best
  const results: SearchResultDto[] = []
  const seen = new Set<number>()

  for (const candidate of candidates) {
    if (seen.has(candidate.assetId)) continue

    seen.add(candidate.assetId)
    results.push({
      assetId: candidate.assetId,
      assetName: candidate.assetName,
      assetUrl: candidate.assetUrl,
      source: candidate.source,
      chunkIndex: candidate.chunkIndex,
      text: candidate.text,
      relevance: candidate.relevance,
    })

    if (results.length === RESULT_LIMIT) break
  }

  return results
}
