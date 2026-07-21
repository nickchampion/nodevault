import { z } from 'zod'
import { aiProviderSchema } from './account.js'
import { phoneSchema, userRoleSchema } from './common.js'

export const loginRequestSchema = z.object({
  email: z.email('Enter a valid email address'),
})

export const verifyRequestSchema = z.object({
  code: z.string().min(1, 'Enter your sign-in code'),
})

export const registerRequestSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(30, 'First name must be 30 characters or fewer'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(30, 'Last name must be 30 characters or fewer'),
  email: z.email('Enter a valid email address'),
  phone: phoneSchema.optional().nullable(),
})

/** Same editable fields as registration: name, email and optional phone. */
export const updateProfileRequestSchema = registerRequestSchema

export type LoginRequest = z.infer<typeof loginRequestSchema>
export type VerifyRequest = z.infer<typeof verifyRequestSchema>
export type RegisterRequest = z.infer<typeof registerRequestSchema>
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>

export const userDtoSchema = z.object({
  id: z.int().positive(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.email(),
  phone: phoneSchema.nullable(),
  roles: z.array(userRoleSchema),
  createdAtUTC: z.iso.datetime(),
})

export const accountDtoSchema = z.object({
  id: z.int().positive(),
  name: z.string(),
  // which AI provider this account runs on — see aiProviderSchema
  aiProvider: aiProviderSchema,
  // whether the account has connected (and verified) its own Google Cloud project
  gcpConfigured: z.boolean(),
  // new accounts run on the platform's GCP project until this date — after it, vault
  // features are gated on gcpConfigured (only meaningful while aiProvider === 'gemini')
  gcpTrialEndsAtUTC: z.iso.datetime(),
  // whether the account has connected (and verified) its own OpenAI key — only
  // meaningful while aiProvider === 'openai'
  openaiConfigured: z.boolean(),
  // true while migrate-to-openai is re-embedding/re-mirroring pre-switch vault content —
  // vault features are blocked until it clears, even though openaiConfigured is already true
  openaiMigrating: z.boolean(),
  // whether the account has connected (and verified) an OpenRouter key — additive to the
  // base provider, unlocks the "Q&A · OpenRouter" mode regardless of aiProvider
  openrouterConfigured: z.boolean(),
  createdAtUTC: z.iso.datetime(),
})

export const authTokensSchema = z.object({
  access: z.string(),
  expiresAtUTC: z.iso.datetime(),
})

/**
 * Returned by auth.verify and auth.register: the authenticated user, their account and
 * the auth tokens for subsequent requests.
 */
export const verifyLoginResponseSchema = z.object({
  user: userDtoSchema,
  account: accountDtoSchema,
  tokens: authTokensSchema,
})

export type UserDto = z.infer<typeof userDtoSchema>
export type AccountDto = z.infer<typeof accountDtoSchema>
export type AuthTokens = z.infer<typeof authTokensSchema>
export type VerifyLoginResponse = z.infer<typeof verifyLoginResponseSchema>
