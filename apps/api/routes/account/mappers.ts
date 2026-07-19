import { toUtcIso } from '@platform/components.utils'
import type { GcpCredentialsStatus, OpenAiCredentialsStatus } from '@platform/components.nodevault.contracts'
import type { Account } from '@platform/components.nodevault.domain'
import { trialEndsAt } from '../../gcp.js'

/**
 * Credential status is metadata only — the stored service-account key is encrypted at
 * rest and deliberately never mapped back out of the API.
 */
export const toGcpStatusDto = (account: Account): GcpCredentialsStatus => ({
  configured: Boolean(account.gcpCredentials && account.gcpVerifiedAtUTC),
  projectId: account.gcpProjectId,
  location: account.gcpLocation,
  verifiedAtUTC: account.gcpVerifiedAtUTC ? toUtcIso(account.gcpVerifiedAtUTC) : null,
  trialEndsAtUTC: toUtcIso(trialEndsAt(account)),
})

/** Credential status is metadata only — the stored API key is encrypted at rest and never mapped back out. */
export const toOpenAiStatusDto = (account: Account): OpenAiCredentialsStatus => ({
  configured: Boolean(account.openaiApiKey && account.openaiVerifiedAtUTC),
  verifiedAtUTC: account.openaiVerifiedAtUTC ? toUtcIso(account.openaiVerifiedAtUTC) : null,
  migrating: Boolean(account.openaiMigratingAtUTC),
})
