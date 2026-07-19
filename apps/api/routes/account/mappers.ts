import { toUtcIso } from '@platform/components.utils'
import type { GcpCredentialsStatus } from '@platform/components.nodevault.contracts'
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
