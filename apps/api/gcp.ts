import { eq } from 'drizzle-orm'
import { cache } from '@platform/components.cache'
import { serverConfiguration } from '@platform/components.configuration.server'
import { toUtcIso } from '@platform/components.utils'
import { decrypt, encrypt } from '@platform/components.utils.server'
import {
  AppError, accounts, assets, vaults,
} from '@platform/components.nodevault.domain'
import type { Account } from '@platform/components.nodevault.domain'
import type { DatabaseClient } from '@platform/components.context'
import type { GcpClientConfig } from '@platform/integrations.gemini'

export const GCP_TRIAL_DAYS = 7

export const GCP_TRIAL_EXPIRED_MESSAGE = 'Your 7-day free trial has ended — connect your own Google Cloud project in Settings to keep using vaults'

/**
 * Bring-your-own-GCP credential access, with a trial window. New accounts run on the
 * platform's own GCP project for their first 7 days; after that every Gemini/Vertex call
 * requires the account's own credentials. The service-account key is stored encrypted on
 * the accounts row (AES-256, keyed by the server config secret) and only decrypted here,
 * at the moment a client is built — it never crosses the API boundary.
 */

export const encryptGcpCredentials = (serviceAccountKeyJson: string): string => (
  encrypt(serviceAccountKeyJson, serverConfiguration.environment.key, serverConfiguration.environment.salt)
)

type GcpColumns = Pick<Account, 'gcpProjectId' | 'gcpLocation' | 'gcpCredentials' | 'gcpVerifiedAtUTC' | 'createdAtUTC'>

export const trialEndsAt = (account: Pick<Account, 'createdAtUTC'>): Date => (
  new Date(account.createdAtUTC.getTime() + GCP_TRIAL_DAYS * 24 * 60 * 60 * 1000)
)

const trialActive = (account: Pick<Account, 'createdAtUTC'>): boolean => Date.now() < trialEndsAt(account).getTime()

/**
 * The platform's own GCP project — what trial accounts run on, and where their Vertex
 * documents live until the migration workflow moves them to the account's own store.
 */
export const platformGcpConfig = (): GcpClientConfig => serverConfiguration.gemini

/** Decrypted GCP config for an account row, or null until credentials are set and verified. */
export const toGcpConfig = (account: GcpColumns): GcpClientConfig | null => {
  if (!account.gcpProjectId || !account.gcpLocation || !account.gcpCredentials || !account.gcpVerifiedAtUTC) return null

  const credentials = decrypt(account.gcpCredentials, serverConfiguration.environment.key, serverConfiguration.environment.salt)

  if (!credentials) return null

  return { project: account.gcpProjectId, location: account.gcpLocation, credentials }
}

/** Whether GCP-backed features are usable right now: own verified credentials, or an active trial. */
export const hasGcpAccess = (account: GcpColumns): boolean => Boolean(toGcpConfig(account)) || trialActive(account)

/**
 * GCP config for cleanup work (deleting mirrored Vertex documents): the account's own
 * credentials when set, otherwise the platform's — trial-era documents live in the
 * platform's data store, and cleanup must keep working after the trial expires.
 */
export const gcpForCleanup = (account: GcpColumns): GcpClientConfig => toGcpConfig(account) ?? platformGcpConfig()

const gcpAccountCacheKey = (accountId: number) => `gcp:account:${accountId}`

/**
 * What we cache per account: exactly the columns GCP resolution needs. The
 * service-account key stays encrypted in the cache (it is only decrypted in
 * toGcpConfig, at the moment a client is built) and dates are ISO strings so the
 * snapshot survives JSON serialisation in the redis engine.
 */
type GcpAccountSnapshot = {
  gcpProjectId: string | null
  gcpLocation: string | null
  gcpCredentials: string | null
  gcpVerifiedAtUTC: string | null
  createdAtUTC: string
}

const toGcpSnapshot = (account: GcpColumns): GcpAccountSnapshot => ({
  gcpProjectId: account.gcpProjectId,
  gcpLocation: account.gcpLocation,
  gcpCredentials: account.gcpCredentials,
  gcpVerifiedAtUTC: account.gcpVerifiedAtUTC ? toUtcIso(account.gcpVerifiedAtUTC) : null,
  createdAtUTC: toUtcIso(account.createdAtUTC),
})

const fromGcpSnapshot = (snapshot: GcpAccountSnapshot): GcpColumns => ({
  gcpProjectId: snapshot.gcpProjectId,
  gcpLocation: snapshot.gcpLocation,
  gcpCredentials: snapshot.gcpCredentials,
  gcpVerifiedAtUTC: snapshot.gcpVerifiedAtUTC ? new Date(snapshot.gcpVerifiedAtUTC) : null,
  createdAtUTC: new Date(snapshot.createdAtUTC),
})

/**
 * Drop an account's cached GCP snapshot. Call after any change to the account's GCP
 * columns has committed — from an afterCommit hook, not inside the transaction, so a
 * rollback can't leave the cache evicted-then-repopulated with stale data.
 */
export const invalidateGcpAccount = async (accountId: number): Promise<void> => cache.del(gcpAccountCacheKey(accountId))

/**
 * Load the GCP config an account's requests should run against: its own verified
 * credentials, or the platform's during the trial window. Throws a 400 pointing at
 * Settings once the trial has ended. Resolution runs off a cached snapshot of the
 * account's GCP columns (credentials still encrypted); the database is only hit on a
 * cache miss.
 */
export const gcpForAccount = async (db: DatabaseClient, accountId: number): Promise<GcpClientConfig> => {
  const snapshot = await cache.get<GcpAccountSnapshot>(
    gcpAccountCacheKey(accountId),
    async () => {
      const account = await db.query.accounts.findFirst({ where: eq(accounts.id, accountId) })

      return account ? toGcpSnapshot(account) : null
    },
    serverConfiguration.cache.timeouts.fifteenMinutes,
  )

  if (!snapshot) throw new AppError('not-found', `Account ${accountId} not found`)

  const account = fromGcpSnapshot(snapshot)
  const own = toGcpConfig(account)

  if (own) return own

  if (trialActive(account)) return platformGcpConfig()

  throw new AppError('validation', GCP_TRIAL_EXPIRED_MESSAGE)
}

export const gcpForVault = async (db: DatabaseClient, vaultId: number): Promise<GcpClientConfig> => {
  const vault = await db.query.vaults.findFirst({
    columns: { accountId: true },
    where: eq(vaults.id, vaultId),
  })

  if (!vault) throw new AppError('not-found', `Vault ${vaultId} not found`)

  return gcpForAccount(db, vault.accountId)
}

export const gcpForAsset = async (db: DatabaseClient, assetId: number): Promise<GcpClientConfig> => {
  const asset = await db.query.assets.findFirst({
    columns: { vaultId: true },
    where: eq(assets.id, assetId),
  })

  if (!asset) throw new AppError('not-found', `Asset ${assetId} not found`)

  return gcpForVault(db, asset.vaultId)
}
