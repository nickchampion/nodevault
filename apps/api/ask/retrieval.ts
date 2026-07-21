import type { AiClient } from '../utils/ai/client.js'
import { hydePrompt } from './prompts.js'

/**
 * HyDE is on for the live ask pipeline. The eval harness overrides this per-run so you can
 * measure the retrieval delta (see .platform/utils/eval). Flip to false to disable everywhere.
 */
export const HYDE_ENABLED = true

/**
 * Turn a question into a hypothetical answer passage for HyDE. Best-effort: a generation
 * failure or empty result falls back to the original question, so retrieval never breaks —
 * it just loses the HyDE benefit for that query.
 */
export const hypotheticalDocument = async (ai: AiClient, question: string): Promise<string> => {
  try {
    // eslint-disable-next-line unicorn/no-await-expression-member
    const generated = (await ai.generateText(hydePrompt(question))).trim()

    return generated || question
  } catch {
    return question
  }
}

/**
 * The vector-arm query embedding for retrieval. With HyDE, we embed a hypothetical answer
 * (answer-shaped text lands near real answer chunks); without it, the question directly. The
 * keyword (BM25) arm is intentionally left to use the real query terms — a hallucinated
 * passage would only add noise to full-text matching — so callers pass the original question
 * to hybridChunkCandidates as `query` and this embedding as `queryEmbedding`.
 */
export const embedForRetrieval = async (ai: AiClient, question: string, hyde: boolean): Promise<number[]> => {
  if (!hyde) return ai.embedQuery(question)

  const hypothetical = await hypotheticalDocument(ai, question)

  return ai.embedQuery(hypothetical)
}
