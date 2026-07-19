import { Buffer } from 'node:buffer'
import { and, eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { DownloadAssetRequest, DownloadAssetResponse } from '@platform/components.nodevault.contracts'
import { assets, vaults } from '@platform/components.nodevault.domain'
import { createR2Client } from '@platform/integrations.cloudflare'

export const assetsDownload: ApiHandler<DownloadAssetRequest, DownloadAssetResponse> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const { vaultId, assetId } = context.event.payload

  const vault = await context.session.db.query.vaults.findFirst({
    columns: { id: true },
    where: and(eq(vaults.id, vaultId), eq(vaults.accountId, accountId)),
  })

  if (!vault) return context.event.response.notFound()

  const asset = await context.session.db.query.assets.findFirst({
    columns: {
      name: true, contentType: true, storageKey: true, source: true,
    },
    where: and(eq(assets.id, assetId), eq(assets.vaultId, vaultId)),
  })

  if (!asset || asset.source !== 'file' || !asset.storageKey) return context.event.response.notFound()

  const body = await createR2Client().get(asset.storageKey)

  return context.event.response.ok({
    name: asset.name ?? 'download',
    contentType: asset.contentType,
    content: Buffer.from(body).toString('base64'),
  })
}
