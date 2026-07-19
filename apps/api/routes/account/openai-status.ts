import { eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { OpenAiCredentialsStatus } from '@platform/components.nodevault.contracts'
import { accounts } from '@platform/components.nodevault.domain'
import { toOpenAiStatusDto } from './mappers.js'

export const accountOpenaiStatus: ApiHandler<void, OpenAiCredentialsStatus> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const account = await context.session.db.query.accounts.findFirst({ where: eq(accounts.id, accountId) })

  if (!account) return context.event.response.notFound()

  return context.event.response.ok(toOpenAiStatusDto(account))
}
