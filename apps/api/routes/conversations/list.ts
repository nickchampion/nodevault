import { and, desc, eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { ListConversationsRequest, ListConversationsResponse } from '@platform/components.contracts'
import { conversations, vaults } from '@platform/components.domain'
import { toConversationDto } from './mappers.js'

const LIST_LIMIT = 50

export const conversationsList: ApiHandler<ListConversationsRequest, ListConversationsResponse> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const { vaultId } = context.event.payload

  const rows = await context.session.db
    .select({ conversation: conversations })
    .from(conversations)
    .innerJoin(vaults, eq(conversations.vaultId, vaults.id))
    .where(and(eq(conversations.vaultId, vaultId), eq(vaults.accountId, accountId)))
    .orderBy(desc(conversations.updatedAtUTC))
    .limit(LIST_LIMIT)

  return context.event.response.ok({ conversations: rows.map(row => toConversationDto(row.conversation)) })
}
