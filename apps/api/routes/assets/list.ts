import { and, desc, eq, sql } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { ListAssetsRequest, ListAssetsResponse } from '@platform/components.nodevault.contracts'
import { assets, vaults } from '@platform/components.nodevault.domain'
import { toAssetDto } from './mappers.js'

export const assetsList: ApiHandler<ListAssetsRequest, ListAssetsResponse> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const {
    vaultId, source, page, pageSize,
  } = context.event.payload

  const vault = await context.session.db.query.vaults.findFirst({
    columns: { id: true },
    where: and(eq(vaults.id, vaultId), eq(vaults.accountId, accountId)),
  })

  if (!vault) return context.event.response.notFound()

  const filter = and(eq(assets.vaultId, vaultId), eq(assets.source, source))

  const rows = await context.session.db
    .select({
      asset: assets,
      total: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(assets)
    .where(filter)
    .orderBy(desc(assets.createdAtUTC), desc(assets.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  return context.event.response.ok({
    assets: rows.map(row => toAssetDto(row.asset)),
    total: rows[0]?.total ?? 0,
    page,
    pageSize,
  })
}
