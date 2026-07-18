import { and, eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { DeleteVaultRequest, OkResponse } from '@platform/components.contracts'
import { assets, vaults } from '@platform/components.domain'
import { createR2Client } from '@platform/integrations.cloudflare'

export const vaultDelete: ApiHandler<DeleteVaultRequest, OkResponse> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const { vaultId } = context.event.payload

  const vault = await context.session.db.query.vaults.findFirst({
    columns: { id: true },
    where: and(eq(vaults.id, vaultId), eq(vaults.accountId, accountId)),
  })

  if (!vault) return context.event.response.notFound()

  const vaultAssets = await context.session.db.query.assets.findMany({
    columns: { storageKey: true },
    where: eq(assets.vaultId, vaultId),
  })

  // assets and asset_chunks reference vaults/assets with onDelete: 'cascade' — deleting the
  // vault row removes them too
  await context.session.db.delete(vaults).where(eq(vaults.id, vaultId))

  context.session.on('afterCommit', async () => {
    const r2 = createR2Client()

    await Promise.all(
      vaultAssets
        .filter(asset => asset.storageKey)
        .map(asset => r2.delete(asset.storageKey!)),
    )
  })

  return context.event.response.ok()
}
