import { and, eq, sql } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { GetVaultRequest, VaultDto } from '@platform/components.contracts'
import { files, vaults } from '@platform/components.domain'
import { toVaultDto } from './mappers.js'

export const vaultGet: ApiHandler<GetVaultRequest, VaultDto> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const [row] = await context.session.db
    .select({
      vault: vaults,
      documentCount: sql<number>`count(${files.id}) filter (where ${files.source} = 'upload')`.mapWith(Number),
      urlCount: sql<number>`count(${files.id}) filter (where ${files.source} = 'url')`.mapWith(Number),
    })
    .from(vaults)
    .leftJoin(files, eq(files.vaultId, vaults.id))
    .where(and(
      eq(vaults.id, context.event.payload.vaultId),
      eq(vaults.accountId, accountId),
    ))
    .groupBy(vaults.id)

  if (!row) return context.event.response.notFound()

  return context.event.response.ok(toVaultDto(row.vault, row.documentCount, row.urlCount))
}
