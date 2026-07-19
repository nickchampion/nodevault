import { and, eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { DeleteVaultRequest, OkResponse } from '@platform/components.contracts'
import { accounts, assets, vaults } from '@platform/components.domain'
import { createR2Client } from '@platform/integrations.cloudflare'
import { createVertexSearchClient } from '@platform/integrations.vertexsearch'
import { toGcpConfig } from '../../gcp.js'

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
  const gcp = account ? toGcpConfig(account) : null

  // assets and asset_chunks reference vaults/assets with onDelete: 'cascade' — deleting the
  // vault row removes them too
  await context.session.db.delete(vaults).where(eq(vaults.id, vaultId))

  context.session.on('afterCommit', async () => {
    const r2 = createR2Client()
    // no credentials on file means nothing was ever mirrored to Vertex — skip those deletes
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
