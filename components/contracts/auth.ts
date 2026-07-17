import { z } from 'zod'
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
