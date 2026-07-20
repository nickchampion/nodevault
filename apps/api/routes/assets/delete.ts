import { and, eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { DeleteAssetRequest, OkResponse } from '@platform/components.nodevault.contracts'
import { accounts, assets, vaults } from '@platform/components.nodevault.domain'
import { createR2Client } from '@platform/integrations.cloudflare'
import { aiClientForCleanup } from '../../utils/ai/client.js'

export const assetsDelete: ApiHandler<DeleteAssetRequest, OkResponse> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const { vaultId, assetId } = context.event.payload

  const vault = await context.session.db.query.vaults.findFirst({
    columns: { id: true },
    where: and(eq(vaults.id, vaultId), eq(vaults.accountId, accountId)),
  })

  if (!vault) return context.event.response.notFound()

  const asset = await context.session.db.query.assets.findFirst({
    columns: { id: true, storageKey: true, openaiFileId: true },
    where: and(eq(assets.id, assetId), eq(assets.vaultId, vaultId)),
  })

  if (!asset) return context.event.response.notFound()

  // asset_chunks reference assets with onDelete: 'cascade' — deleting the asset row removes them too
  await context.session.db.delete(assets).where(eq(assets.id, asset.id))

  if (asset.storageKey) {
    await createR2Client().delete(asset.storageKey)
  }

  const account = await context.session.db.query.accounts.findFirst({ where: eq(accounts.id, accountId) })

  // own credentials when set, platform's otherwise — trial-era mirrors live in the platform store
  const ai = account ? aiClientForCleanup(context.session.db, account) : null

  if (ai) await ai.deleteAssetMirror(asset.id, asset.openaiFileId)

  return context.event.response.ok()
}
