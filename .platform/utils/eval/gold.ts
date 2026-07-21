import { readFileSync } from 'node:fs'
import { z } from 'zod'

/**
 * A gold case: a real question, the vault it should be answered from, and the assets whose
 * content actually answers it. Relevance is at asset (document) granularity because that is
 * what a human can realistically label — you know which document holds the answer, not which
 * 1000-token chunk of it. `notes` is a free-text reminder of why these assets are the answer.
 */
export const goldCaseSchema = z.object({
  question: z.string().min(1),
  vaultId: z.number().int().positive(),
  relevantAssetIds: z.array(z.number().int().positive()).min(1),
  notes: z.string().optional(),
})

export const goldSetSchema = z.object({
  /** prompt-budget cutoff to score at; defaults to the pipeline's RAG_CHUNK_LIMIT when omitted */
  k: z.number().int().positive().optional(),
  cases: z.array(goldCaseSchema).min(1),
})

export type GoldCase = z.infer<typeof goldCaseSchema>
export type GoldSet = z.infer<typeof goldSetSchema>

export const loadGoldSet = (path: string): GoldSet => {
  const raw = JSON.parse(readFileSync(path, 'utf8'))

  return goldSetSchema.parse(raw)
}
