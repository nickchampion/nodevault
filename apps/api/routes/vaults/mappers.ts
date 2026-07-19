import { toUtcIso } from '@platform/components.utils'
import type { VaultDto } from '@platform/components.contracts'
import type { Vault } from '@platform/components.domain'

type VaultCounts = {
  documentCount: number
  urlCount: number
  conversationCount: number
}

export const toVaultDto = (vault: Vault, counts: VaultCounts): VaultDto => ({
  id: vault.id,
  name: vault.name,
  documentCount: counts.documentCount,
  urlCount: counts.urlCount,
  conversationCount: counts.conversationCount,
  createdAtUTC: toUtcIso(vault.createdAtUTC),
})
