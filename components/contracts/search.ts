import { z } from 'zod'
import { assetSourceSchema } from './assets.js'

export const searchTypeSchema = z.enum(['retrieval', 'qa'])

export type SearchType = z.infer<typeof searchTypeSchema>

export const searchVaultRequestSchema = z.object({
  vaultId: z.int().positive(),
  query: z.string().trim().min(1, 'Enter a search term').max(1000),
  type: searchTypeSchema,
})

export type SearchVaultRequest = z.infer<typeof searchVaultRequestSchema>

export const searchResultDtoSchema = z.object({
  assetId: z.int().positive(),
  assetName: z.string().nullable(),
  assetUrl: z.string().nullable(),
  source: assetSourceSchema,
  chunkIndex: z.int().nonnegative(),
  text: z.string(),
  // reciprocal-rank-fusion score combining vector similarity and full-text rank — meaningful
  // only relative to other results in the same response, not a calibrated 0-1 confidence
  relevance: z.number(),
})

export type SearchResultDto = z.infer<typeof searchResultDtoSchema>

export const searchVaultResponseSchema = z.object({
  type: searchTypeSchema,
  results: z.array(searchResultDtoSchema),
})

export type SearchVaultResponse = z.infer<typeof searchVaultResponseSchema>
