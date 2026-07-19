import { and, eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { SearchVaultRequest, SearchVaultResponse } from '@platform/components.nodevault.contracts'
import { vaults } from '@platform/components.nodevault.domain'
import { aiClientForAccount } from '../../../ai.js'
import { resolveSearchStrategy } from './factory.js'

export const assetsSearch: ApiHandler<SearchVaultRequest, SearchVaultResponse> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const { vaultId, query, type } = context.event.payload

  const vault = await context.session.db.query.vaults.findFirst({
    columns: { id: true },
    where: and(eq(vaults.id, vaultId), eq(vaults.accountId, accountId)),
  })

  if (!vault) return context.event.response.notFound()

  const ai = await aiClientForAccount(context.session.db, accountId)

  const search = resolveSearchStrategy(type)
  const results = await search(context.session.db, ai, vaultId, query)

  return context.event.response.ok({ type, results })
}
