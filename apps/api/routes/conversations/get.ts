import { and, eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { GetConversationRequest, GetConversationResponse } from '@platform/components.contracts'
import { conversationMessages, conversations, vaults } from '@platform/components.domain'
import { toConversationDto, toConversationMessageDto } from './mappers.js'

export const conversationsGet: ApiHandler<GetConversationRequest, GetConversationResponse> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const { vaultId, conversationId } = context.event.payload

  const [row] = await context.session.db
    .select({ conversation: conversations })
    .from(conversations)
    .innerJoin(vaults, eq(conversations.vaultId, vaults.id))
    .where(and(
      eq(conversations.id, conversationId),
      eq(conversations.vaultId, vaultId),
      eq(vaults.accountId, accountId),
    ))

  if (!row) return context.event.response.notFound()

  const messages = await context.session.db.query.conversationMessages.findMany({
    where: eq(conversationMessages.conversationId, conversationId),
    orderBy: conversationMessages.id,
  })

  return context.event.response.ok({
    conversation: toConversationDto(row.conversation),
    messages: messages.map(toConversationMessageDto),
  })
}
