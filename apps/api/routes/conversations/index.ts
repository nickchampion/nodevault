import { execute, protectedProcedure, router } from '@platform/components.api'
import {
  deleteConversationRequestSchema,
  getConversationRequestSchema,
  getConversationResponseSchema,
  listConversationsRequestSchema,
  listConversationsResponseSchema,
  okResponseSchema,
} from '@platform/components.nodevault.contracts'
import { conversationsDelete } from './delete.js'
import { conversationsGet } from './get.js'
import { conversationsList } from './list.js'

// conversations are created implicitly by the first ask (POST /ask/stream) — no create procedure
export const conversationsRouter = router({
  list: protectedProcedure
    .input(listConversationsRequestSchema)
    .output(listConversationsResponseSchema)
    .query(execute(conversationsList)),

  get: protectedProcedure
    .input(getConversationRequestSchema)
    .output(getConversationResponseSchema)
    .query(execute(conversationsGet)),

  delete: protectedProcedure
    .input(deleteConversationRequestSchema)
    .output(okResponseSchema)
    .mutation(execute(conversationsDelete)),
})
