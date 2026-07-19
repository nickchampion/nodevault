import { eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { GcpCredentialsStatus } from '@platform/components.contracts'
import { accounts } from '@platform/components.domain'
import { toGcpStatusDto } from './mappers.js'

export const accountGcpStatus: ApiHandler<void, GcpCredentialsStatus> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const account = await context.session.db.query.accounts.findFirst({ where: eq(accounts.id, accountId) })

  if (!account) return context.event.response.notFound()

  return context.event.response.ok(toGcpStatusDto(account))
}
