import { eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { OpenRouterCredentialsStatus } from '@platform/components.nodevault.contracts'
import { accounts } from '@platform/components.nodevault.domain'
import { toOpenRouterStatusDto } from './mappers.js'

export const accountOpenRouterStatus: ApiHandler<void, OpenRouterCredentialsStatus> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const account = await context.session.db.query.accounts.findFirst({ where: eq(accounts.id, accountId) })

  if (!account) return context.event.response.notFound()

  return context.event.response.ok(toOpenRouterStatusDto(account))
}
