import {
  and, desc, eq, ilike, sql,
} from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { ListConversationsRequest, ListConversationsResponse } from '@platform/components.nodevault.contracts'
import { conversations, vaults } from '@platform/components.nodevault.domain'
import { toConversationDto } from './mappers.js'

export const conversationsList: ApiHandler<ListConversationsRequest, ListConversationsResponse> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const {
    vaultId, search, page, pageSize,
  } = context.event.payload

  // escape LIKE wildcards so the search matches keywords literally
  const pattern = search ? `%${search.replaceAll(/[\\%_]/g, String.raw`\$&`)}%` : null

  const rows = await context.session.db
    .select({
      conversation: conversations,
      vaultName: vaults.name,
      total: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(conversations)
    .innerJoin(vaults, eq(conversations.vaultId, vaults.id))
    .where(and(
      eq(vaults.accountId, accountId),
      ...(vaultId ? [eq(conversations.vaultId, vaultId)] : []),
      ...(pattern ? [ilike(conversations.title, pattern)] : []),
    ))
    .orderBy(desc(conversations.updatedAtUTC), desc(conversations.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  return context.event.response.ok({
    conversations: rows.map(row => toConversationDto(row.conversation, row.vaultName)),
    total: rows[0]?.total ?? 0,
    page,
    pageSize,
  })
}
