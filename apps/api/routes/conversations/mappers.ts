import { toUtcIso } from '@platform/components.utils'
import type { ConversationDto, ConversationMessageDto } from '@platform/components.contracts'
import type { Conversation, ConversationMessage } from '@platform/components.domain'

export const toConversationDto = (conversation: Conversation): ConversationDto => ({
  id: conversation.id,
  vaultId: conversation.vaultId,
  title: conversation.title,
  createdAtUTC: toUtcIso(conversation.createdAtUTC),
  updatedAtUTC: toUtcIso(conversation.updatedAtUTC),
})

export const toConversationMessageDto = (message: ConversationMessage): ConversationMessageDto => ({
  id: message.id,
  role: message.role,
  content: message.content,
  citations: message.citations ?? [],
  createdAtUTC: toUtcIso(message.createdAtUTC),
})
