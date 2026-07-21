import { z } from 'zod'

/** Which AI provider an account runs on — see components/nodevault/domain/models/account.ts. */
export const aiProviderSchema = z.enum(['gemini', 'openai'])

export type AiProvider = z.infer<typeof aiProviderSchema>

/**
 * Bring-your-own-GCP: each account connects its own Google Cloud project, and every
 * Gemini / Vertex AI call the platform makes for that account runs against it. The
 * service-account key is write-only through the API — it is encrypted before storage
 * and never returned to the client; status responses carry metadata only.
 */

/** GCP project ids: 6–30 chars, lowercase letters/digits/hyphens, must start with a letter. */
export const gcpProjectIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/, 'Enter a valid GCP project ID (lowercase letters, digits and hyphens)')

const serviceAccountKeySchema = z
  .string()
  .min(1, 'Paste your service account key JSON')
  .superRefine((value, context) => {
    let parsed: unknown

    try {
      parsed = JSON.parse(value)
    } catch {
      context.addIssue({ code: 'custom', message: 'The key must be valid JSON — paste the full file downloaded from Google Cloud' })

      return
    }

    const key = parsed as Record<string, unknown>

    if (key.type !== 'service_account') {
      context.addIssue({ code: 'custom', message: 'This JSON is not a service account key (expected "type": "service_account")' })

      return
    }

    if (!key.client_email || !key.private_key) {
      context.addIssue({ code: 'custom', message: 'The key is missing its client_email or private_key field' })
    }
  })

export const setGcpCredentialsRequestSchema = z.object({
  projectId: gcpProjectIdSchema,
  location: z.string().min(1, 'Choose a Vertex AI region'),
  serviceAccountKey: serviceAccountKeySchema,
})

/** Safe-to-display credential state — never includes any part of the stored key. */
export const gcpCredentialsStatusSchema = z.object({
  configured: z.boolean(),
  projectId: z.string().nullable(),
  location: z.string().nullable(),
  verifiedAtUTC: z.iso.datetime().nullable(),
  trialEndsAtUTC: z.iso.datetime(),
})

/** Emitted when an account first connects its own GCP project (trial → own credentials). */
export const accountGcpConnectedEventSchema = z.object({
  accountId: z.int().positive(),
})

export type SetGcpCredentialsRequest = z.infer<typeof setGcpCredentialsRequestSchema>
export type GcpCredentialsStatus = z.infer<typeof gcpCredentialsStatusSchema>
export type AccountGcpConnectedEvent = z.infer<typeof accountGcpConnectedEventSchema>

/**
 * Bring-your-own-OpenAI: a one-way switch, only available while an account is still on
 * the Gemini trial and hasn't connected real GCP credentials (see set-openai-key.ts).
 * Once connected the account is locked to OpenAI forever — this same request/response
 * pair is reused afterwards for key rotation only.
 */
export const setOpenAiKeyRequestSchema = z.object({
  apiKey: z.string().min(1, 'Paste your OpenAI API key'),
})

/** Safe-to-display credential state — never includes any part of the stored key. */
export const openaiCredentialsStatusSchema = z.object({
  configured: z.boolean(),
  verifiedAtUTC: z.iso.datetime().nullable(),
  // true while migrate-to-openai is re-embedding/re-mirroring pre-switch vault content
  migrating: z.boolean(),
})

/** Emitted when an account switches from the Gemini trial to OpenAI — fires the migration workflow. */
export const accountOpenaiConnectedEventSchema = z.object({
  accountId: z.int().positive(),
})

export type SetOpenAiKeyRequest = z.infer<typeof setOpenAiKeyRequestSchema>
export type OpenAiCredentialsStatus = z.infer<typeof openaiCredentialsStatusSchema>
export type AccountOpenaiConnectedEvent = z.infer<typeof accountOpenaiConnectedEventSchema>

/**
 * Bring-your-own-OpenRouter: an *additive* generation override on top of the account's
 * base provider (Gemini/OpenAI), which still does embeddings + retrieval. Requires a base
 * provider to already be connected. The key is write-only — encrypted before storage and
 * never returned; status responses carry metadata only.
 */
export const setOpenRouterKeyRequestSchema = z.object({
  apiKey: z.string().min(1, 'Paste your OpenRouter API key'),
})

/** Safe-to-display credential state — never includes any part of the stored key. */
export const openRouterCredentialsStatusSchema = z.object({
  configured: z.boolean(),
  verifiedAtUTC: z.iso.datetime().nullable(),
})

/** A single OpenRouter model, as surfaced to the model picker. */
export const openRouterModelDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  contextLength: z.number().nullable(),
  promptPrice: z.string().nullable(),
  completionPrice: z.string().nullable(),
})

export const openRouterModelsResponseSchema = z.object({
  models: z.array(openRouterModelDtoSchema),
})

export type SetOpenRouterKeyRequest = z.infer<typeof setOpenRouterKeyRequestSchema>
export type OpenRouterCredentialsStatus = z.infer<typeof openRouterCredentialsStatusSchema>
export type OpenRouterModelDto = z.infer<typeof openRouterModelDtoSchema>
export type OpenRouterModelsResponse = z.infer<typeof openRouterModelsResponseSchema>
