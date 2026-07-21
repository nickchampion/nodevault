/**
 * Pure retrieval-quality metrics — no DB, no network, no config. This is the scoreable
 * core of the eval harness: given what retrieval returned (ranked) and which assets the
 * gold set says are relevant, produce the numbers you compare across experiments (HyDE,
 * reranking, contextual chunks, ...). Kept pure so it lives in the normal vitest suite.
 *
 * Relevance is judged at ASSET granularity (a retrieved chunk counts as relevant when its
 * asset is one the gold case expects), but scored over the ranked list of CHUNKS, because
 * chunks are what actually get stuffed into the answer prompt — the top-k chunk slots are
 * a real, finite budget (RAG_CHUNK_LIMIT), so "did a relevant chunk reach the prompt" is
 * the honest question.
 */

/** A single retrieved item, in rank order (rank 1 first). */
export type RetrievedChunk = { chunkId: number, assetId: number }

export type CaseScore = {

  /** number of relevant assets the gold case expects */
  relevantAssets: number

  /** chunks retrieved into the top-k prompt budget */
  retrieved: number

  /** 1 if at least one relevant chunk reached the top-k, else 0 — if this is 0 the LLM cannot answer */
  hit: number

  /** fraction of the top-k chunk slots that were relevant (signal-to-noise of the prompt) */
  precisionAtK: number

  /** fraction of expected assets represented anywhere in the top-k chunks */
  assetRecallAtK: number

  /** 1 / rank of the first relevant chunk (0 if none) */
  reciprocalRank: number

  /** binary normalised discounted cumulative gain over the top-k, ideal = all relevant first */
  ndcgAtK: number
}

/** Boolean relevance flags for the top-k, in rank order. */
const relevanceFlags = (retrieved: RetrievedChunk[], relevant: Set<number>, k: number): boolean[] => retrieved.slice(0, k).map(chunk => relevant.has(chunk.assetId))

export const hitAtK = (flags: boolean[]): number => (flags.some(Boolean) ? 1 : 0)

export const precisionAtK = (flags: boolean[], k: number): number => (k === 0 ? 0 : flags.filter(Boolean).length / k)

/** 1 / (rank of first relevant), rank 1-indexed; 0 when nothing relevant is present. */
export const reciprocalRank = (flags: boolean[]): number => {
  const firstHit = flags.indexOf(true)

  return firstHit === -1 ? 0 : 1 / (firstHit + 1)
}

/**
 * Binary nDCG@k. DCG discounts each relevant hit by log2 of its rank; the ideal ranking
 * places every relevant item first, so IDCG uses min(k, relevantAvailable) perfect slots.
 * Clamped to [0,1] because an asset can contribute more than one relevant chunk.
 */
export const ndcgAtK = (flags: boolean[], relevantAvailable: number): number => {
  if (relevantAvailable === 0) return 0

  const dcg = flags.reduce((sum, isRelevant, index) => (
    isRelevant ? sum + 1 / Math.log2(index + 2) : sum
  ), 0)

  const idealHits = Math.min(flags.length, relevantAvailable)
  const idcg = Array.from({ length: idealHits }, (_, index) => 1 / Math.log2(index + 2))
    .reduce((sum, gain) => sum + gain, 0)

  return idcg === 0 ? 0 : Math.min(1, dcg / idcg)
}

/** Distinct expected assets that appear anywhere in the top-k chunks, over total expected. */
export const assetRecallAtK = (retrieved: RetrievedChunk[], relevant: Set<number>, k: number): number => {
  if (relevant.size === 0) return 0

  const found = new Set<number>()

  for (const chunk of retrieved.slice(0, k)) {
    if (relevant.has(chunk.assetId)) found.add(chunk.assetId)
  }

  return found.size / relevant.size
}

export const scoreCase = (retrieved: RetrievedChunk[], relevantAssetIds: number[], k: number): CaseScore => {
  const relevant = new Set(relevantAssetIds)
  const flags = relevanceFlags(retrieved, relevant, k)

  return {
    relevantAssets: relevant.size,
    retrieved: Math.min(retrieved.length, k),
    hit: hitAtK(flags),
    precisionAtK: precisionAtK(flags, k),
    assetRecallAtK: assetRecallAtK(retrieved, relevant, k),
    reciprocalRank: reciprocalRank(flags),
    ndcgAtK: ndcgAtK(flags, relevant.size),
  }
}

export type Aggregate = {
  cases: number
  hitRate: number
  meanPrecisionAtK: number
  meanAssetRecallAtK: number
  mrr: number
  meanNdcgAtK: number
}

const mean = (values: number[]): number => (values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length)

/** Mean each metric across cases — hitRate is the mean of the per-case 0/1 hit, MRR the mean reciprocal rank. */
export const aggregate = (scores: CaseScore[]): Aggregate => ({
  cases: scores.length,
  hitRate: mean(scores.map(score => score.hit)),
  meanPrecisionAtK: mean(scores.map(score => score.precisionAtK)),
  meanAssetRecallAtK: mean(scores.map(score => score.assetRecallAtK)),
  mrr: mean(scores.map(score => score.reciprocalRank)),
  meanNdcgAtK: mean(scores.map(score => score.ndcgAtK)),
})
