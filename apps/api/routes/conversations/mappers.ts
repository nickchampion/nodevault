import { toUtcIso } from '@platform/components.utils'
import type { ConversationDto, ConversationMessageDto } from '@platform/components.nodevault.contracts'
import type { Conversation, ConversationMessage } from '@platform/components.nodevault.domain'

export const toConversationDto = (conversation: Conversation, vaultName: string): ConversationDto => ({
  id: conversation.id,
  vaultId: conversation.vaultId,
  vaultName,
  title: conversation.title,
  mode: conversation.mode,
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
