import { toUtcIso } from '@platform/components.utils'
import type { GcpCredentialsStatus, OpenAiCredentialsStatus } from '@platform/components.nodevault.contracts'
import type { Account } from '@platform/components.nodevault.domain'
import { trialEndsAt } from '../../utils/ai/gcp.js'

export const toGcpStatusDto = (account: Account): GcpCredentialsStatus => ({
  configured: Boolean(account.gcpCredentials && account.gcpVerifiedAtUTC),
  projectId: account.gcpProjectId,
  location: account.gcpLocation,
  verifiedAtUTC: account.gcpVerifiedAtUTC ? toUtcIso(account.gcpVerifiedAtUTC) : null,
  trialEndsAtUTC: toUtcIso(trialEndsAt(account)),
})

export const toOpenAiStatusDto = (account: Account): OpenAiCredentialsStatus => ({
  configured: Boolean(account.openaiApiKey && account.openaiVerifiedAtUTC),
  verifiedAtUTC: account.openaiVerifiedAtUTC ? toUtcIso(account.openaiVerifiedAtUTC) : null,
  migrating: Boolean(account.openaiMigratingAtUTC),
})
