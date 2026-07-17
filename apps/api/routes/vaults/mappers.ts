import { toUtcIso } from '@platform/components.utils'
import type { VaultDto } from '@platform/components.contracts'
import type { Vault } from '@platform/components.domain'

export const toVaultDto = (vault: Vault, documentCount: number, urlCount: number): VaultDto => ({
  id: vault.id,
  name: vault.name,
  documentCount,
  urlCount,
  createdAtUTC: toUtcIso(vault.createdAtUTC),
})
