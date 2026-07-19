import { and, eq, sql } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { CreateVaultRequest, VaultDto } from '@platform/components.nodevault.contracts'
import { vaults } from '@platform/components.nodevault.domain'
import { aiClientForAccount } from '../../ai.js'
import { toVaultDto } from './mappers.js'

export const vaultCreate: ApiHandler<CreateVaultRequest, VaultDto> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  // vaults need a working AI provider (own credentials, or the Gemini trial) — refuse
  // creation otherwise (throws a 400 pointing at Settings)
  await aiClientForAccount(context.session.db, accountId)

  const name = context.event.payload.name.trim()

  // friendly pre-check; the unique index on (account_id, lower(name)) is the real
  // guarantee and surfaces as a 409 if two creations race
  const existing = await context.session.db.query.vaults.findFirst({
    columns: { id: true },
    where: and(
      eq(vaults.accountId, accountId),
      sql`lower(${vaults.name}) = ${name.toLowerCase()}`,
    ),
  })

  if (existing) {
    return context.event.response.badRequestCustom('name', 'A vault with this name already exists')
  }

  const [vault] = await context.session.db
    .insert(vaults)
    .values({ accountId, name })
    .returning()

  return context.event.response.created(toVaultDto(vault, { documentCount: 0, urlCount: 0, conversationCount: 0 }))
}
