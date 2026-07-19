import { and, eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { DeleteVaultRequest, OkResponse } from '@platform/components.nodevault.contracts'
import { accounts, assets, vaults } from '@platform/components.nodevault.domain'
import { createR2Client } from '@platform/integrations.cloudflare'
import { createVertexSearchClient } from '@platform/integrations.vertexsearch'
import { gcpForCleanup } from '../../gcp.js'

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
    columns: { id: true, storageKey: true },
    where: eq(assets.vaultId, vaultId),
  })

  const account = await context.session.db.query.accounts.findFirst({ where: eq(accounts.id, accountId) })

  // own credentials when set, platform's otherwise — trial-era mirrors live in the platform store
  const gcp = account ? gcpForCleanup(account) : null

  // assets and asset_chunks reference vaults/assets with onDelete: 'cascade' — deleting the
  // vault row removes them too
  await context.session.db.delete(vaults).where(eq(vaults.id, vaultId))

  context.session.on('afterCommit', async () => {
    const r2 = createR2Client()
    const vertex = gcp ? createVertexSearchClient(gcp) : null

    await Promise.all([
      ...vaultAssets
        .filter(asset => asset.storageKey)
        .map(asset => r2.delete(asset.storageKey!)),
      ...(vertex ? vaultAssets.map(asset => vertex.deleteAssetDocument(asset.id)) : []),
    ])
  })

  return context.event.response.ok()
}
