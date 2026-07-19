import { toUtcIso } from '@platform/components.utils'
import type { AssetDto } from '@platform/components.nodevault.contracts'
import type { VaultAsset } from '@platform/components.nodevault.domain'

export const toAssetDto = (asset: VaultAsset): AssetDto => ({
  id: asset.id,
  source: asset.source,
  name: asset.name,
  url: asset.url,
  contentType: asset.contentType,
  sizeBytes: asset.sizeBytes,
  status: asset.status,
  error: asset.error,
  createdAtUTC: toUtcIso(asset.createdAtUTC),
})
