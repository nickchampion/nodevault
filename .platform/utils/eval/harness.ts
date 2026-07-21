import { aiClientForVault } from '../../../apps/api/utils/ai/client.js'
import type { AiClient } from '../../../apps/api/utils/ai/client.js'
import { withSession } from '../../../apps/api/utils/db.js'
import { hybridChunkCandidates } from '../../../apps/api/routes/assets/search/candidates.js'
import { embedForRetrieval, HYDE_ENABLED } from '../../../apps/api/ask/retrieval.js'
import { aggregate, scoreCase } from './metrics.js'
import type { Aggregate, CaseScore, RetrievedChunk } from './metrics.js'
import type { GoldCase, GoldSet } from './gold.js'

/**
 * Default prompt-budget cutoff — mirrors RAG_CHUNK_LIMIT in the ask pipeline so the eval
 * scores exactly the slice of chunks that would have reached the answer prompt.
 */
export const DEFAULT_K = 8

export type EvalOptions = {
  k: number

  /** apply HyDE to the vector arm (as the live pipeline does); toggle off for the baseline */
  hyde: boolean
}

export type CaseResult = {
  case: GoldCase
  retrieved: (RetrievedChunk & { assetName: string | null })[]
  score: CaseScore
}

export type EvalReport = {
  options: EvalOptions
  results: CaseResult[]
  summary: Aggregate
}

/**
 * Replays each gold question through the live retrieval stack — same query embedding (HyDE
 * optional), same hybridChunkCandidates fusion the ask pipeline uses — and scores what came
 * back. Build one AI client per vault (embedding calls hit Gemini/OpenAI; the account config
 * is cached), and run each retrieval in its own short session, matching the pipeline's
 * connection discipline.
 */
export const runEval = async (gold: GoldSet, options?: Partial<EvalOptions>): Promise<EvalReport> => {
  const resolved: EvalOptions = {
    k: options?.k ?? gold.k ?? DEFAULT_K,
    hyde: options?.hyde ?? HYDE_ENABLED,
  }

  const clients = new Map<number, AiClient>()

  const clientForVault = async (vaultId: number): Promise<AiClient> => {
    const existing = clients.get(vaultId)

    if (existing) return existing

    const client = await withSession(db => aiClientForVault(db, vaultId))

    clients.set(vaultId, client)

    return client
  }

  const results: CaseResult[] = []

  for (const goldCase of gold.cases) {
    const ai = await clientForVault(goldCase.vaultId)
    const queryEmbedding = await embedForRetrieval(ai, goldCase.question, resolved.hyde)

    const chunks = await withSession(db => hybridChunkCandidates(db, goldCase.vaultId, goldCase.question, queryEmbedding, resolved.k))

    const retrieved = chunks.map(chunk => ({
      chunkId: chunk.chunkId,
      assetId: chunk.assetId,
      assetName: chunk.assetName,
    }))

    results.push({
      case: goldCase,
      retrieved,
      score: scoreCase(retrieved, goldCase.relevantAssetIds, resolved.k),
    })
  }

  return { options: resolved, results, summary: aggregate(results.map(result => result.score)) }
}
