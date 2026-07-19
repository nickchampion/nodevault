import { eq } from 'drizzle-orm'
import { serverConfiguration } from '@platform/components.configuration.server'
import { decrypt, encrypt } from '@platform/components.utils.server'
import {
  AppError, accounts, assets, vaults,
} from '@platform/components.domain'
import type { Account } from '@platform/components.domain'
import type { DatabaseClient } from '@platform/components.context'
import type { GcpClientConfig } from '@platform/integrations.gemini'

export const GCP_NOT_CONFIGURED_MESSAGE = 'Connect and verify your Google Cloud project in Settings before using vaults'

/**
 * Bring-your-own-GCP credential access. The service-account key is stored encrypted on
 * the accounts row (AES-256, keyed by the server config secret) and only decrypted here,
 * at the moment a Gemini/Vertex client is built — it never crosses the API boundary.
 */

export const encryptGcpCredentials = (serviceAccountKeyJson: string): string => (
  encrypt(serviceAccountKeyJson, serverConfiguration.environment.key, serverConfiguration.environment.salt)
)

type GcpColumns = Pick<Account, 'gcpProjectId' | 'gcpLocation' | 'gcpCredentials' | 'gcpVerifiedAtUTC'>

/** Decrypted GCP config for an account row, or null until credentials are set and verified. */
export const toGcpConfig = (account: GcpColumns): GcpClientConfig | null => {
  if (!account.gcpProjectId || !account.gcpLocation || !account.gcpCredentials || !account.gcpVerifiedAtUTC) return null

  const credentials = decrypt(account.gcpCredentials, serverConfiguration.environment.key, serverConfiguration.environment.salt)

  if (!credentials) return null

  return { project: account.gcpProjectId, location: account.gcpLocation, credentials }
}

/** Load and decrypt an account's GCP config; throws a 400 telling the user to connect their project. */
export const gcpForAccount = async (db: DatabaseClient, accountId: number): Promise<GcpClientConfig> => {
  const account = await db.query.accounts.findFirst({ where: eq(accounts.id, accountId) })
  const config = account ? toGcpConfig(account) : null

  if (!config) throw new AppError('validation', GCP_NOT_CONFIGURED_MESSAGE)

  return config
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
