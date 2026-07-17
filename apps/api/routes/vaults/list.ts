import { eq, sql } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { ListVaultsResponse } from '@platform/components.contracts'
import { files, vaults } from '@platform/components.domain'
import { toVaultDto } from './mappers.js'

export const vaultsList: ApiHandler<unknown, ListVaultsResponse> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const rows = await context.session.db
    .select({
      vault: vaults,
      documentCount: sql<number>`count(${files.id}) filter (where ${files.source} = 'upload')`.mapWith(Number),
      urlCount: sql<number>`count(${files.id}) filter (where ${files.source} = 'url')`.mapWith(Number),
    })
    .from(vaults)
    .leftJoin(files, eq(files.vaultId, vaults.id))
    .where(eq(vaults.accountId, accountId))
    .groupBy(vaults.id)
    .orderBy(vaults.createdAtUTC)

  return context.event.response.ok({
    vaults: rows.map(row => toVaultDto(row.vault, row.documentCount, row.urlCount)),
  })
}
