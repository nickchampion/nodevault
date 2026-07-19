import { and, eq, sql } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { GetVaultRequest, VaultDto } from '@platform/components.contracts'
import { assets, conversations, vaults } from '@platform/components.domain'
import { toVaultDto } from './mappers.js'

export const vaultGet: ApiHandler<GetVaultRequest, VaultDto> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const [row] = await context.session.db
    .select({
      vault: vaults,
      documentCount: sql<number>`count(${assets.id}) filter (where ${assets.source} = 'file')`.mapWith(Number),
      urlCount: sql<number>`count(${assets.id}) filter (where ${assets.source} = 'url')`.mapWith(Number),
      // subquery rather than a second join — joining conversations would multiply the asset rows
      conversationCount: sql<number>`(select count(*) from ${conversations} where ${conversations.vaultId} = ${vaults.id})`.mapWith(Number),
    })
    .from(vaults)
    .leftJoin(assets, eq(assets.vaultId, vaults.id))
    .where(and(
      eq(vaults.id, context.event.payload.vaultId),
      eq(vaults.accountId, accountId),
    ))
    .groupBy(vaults.id)

  if (!row) return context.event.response.notFound()

  return context.event.response.ok(toVaultDto(row.vault, row))
}
