import { and, eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { DeleteConversationRequest, OkResponse } from '@platform/components.contracts'
import { conversations, vaults } from '@platform/components.domain'

export const conversationsDelete: ApiHandler<DeleteConversationRequest, OkResponse> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const { vaultId, conversationId } = context.event.payload

  const [row] = await context.session.db
    .select({ id: conversations.id })
    .from(conversations)
    .innerJoin(vaults, eq(conversations.vaultId, vaults.id))
    .where(and(
      eq(conversations.id, conversationId),
      eq(vaults.accountId, accountId),
      ...(vaultId ? [eq(conversations.vaultId, vaultId)] : []),
    ))

  if (!row) return context.event.response.notFound()

  // messages reference conversations with onDelete: 'cascade'
  await context.session.db.delete(conversations).where(eq(conversations.id, conversationId))

  return context.event.response.ok()
}
