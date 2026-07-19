import { z } from 'zod'

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
})

export type SetGcpCredentialsRequest = z.infer<typeof setGcpCredentialsRequestSchema>
export type GcpCredentialsStatus = z.infer<typeof gcpCredentialsStatusSchema>
