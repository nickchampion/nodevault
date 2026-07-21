import { z } from 'zod'
import { assetSourceSchema } from './assets.js'

export const conversationRoleSchema = z.enum(['user', 'assistant'])

export type ConversationRole = z.infer<typeof conversationRoleSchema>

// snapshot of a source shown for an assistant answer — asset fields are copied, not
// referenced, so answers keep rendering after the underlying asset is deleted
export const citationDtoSchema = z.object({
  // the [n] marker used in the prompt's numbered source list and the answer text
  ordinal: z.int().positive(),
  assetId: z.int().positive(),
  assetName: z.string().nullable(),
  assetUrl: z.string().nullable(),
  source: assetSourceSchema,
  // position of the grounding chunk within the asset — null for managed-mode answers,
  // where retrieval happens inside the provider's managed store and no local chunk exists
  chunkIndex: z.int().nonnegative().nullable(),
})

export type CitationDto = z.infer<typeof citationDtoSchema>

export const conversationMessageDtoSchema = z.object({
  id: z.int().positive(),
  role: conversationRoleSchema,
  content: z.string(),
  citations: z.array(citationDtoSchema),
  createdAtUTC: z.iso.datetime(),
})

export type ConversationMessageDto = z.infer<typeof conversationMessageDtoSchema>

// which retrieval stack answers the question: 'local' is the hand-rolled RAG pipeline
// (pgvector hybrid retrieval + prompt stuffing), 'managed' grounds generation on the
// account's managed retrieval store — Vertex AI Search for Gemini accounts, an OpenAI
// vector store (file_search) for OpenAI accounts
export const askModeSchema = z.enum(['local', 'managed'])

export type AskMode = z.infer<typeof askModeSchema>

export const conversationDtoSchema = z.object({
  id: z.int().positive(),
  vaultId: z.int().positive(),
  vaultName: z.string(),
  title: z.string(),
  // the retrieval mode the conversation was created in — the search page opens it on
  // the matching Q&A tab
  mode: askModeSchema,
  createdAtUTC: z.iso.datetime(),
  updatedAtUTC: z.iso.datetime(),
})

export type ConversationDto = z.infer<typeof conversationDtoSchema>

// vaultId absent → conversations across all of the account's vaults
export const listConversationsRequestSchema = z.object({
  vaultId: z.int().positive().optional(),
  // keyword match against the conversation title
  search: z.string().trim().max(200).optional(),
  page: z.int().positive().default(1),
  pageSize: z.int().positive().max(100).default(10),
})

export type ListConversationsRequest = z.infer<typeof listConversationsRequestSchema>

export const listConversationsResponseSchema = z.object({
  conversations: z.array(conversationDtoSchema),
  total: z.int().nonnegative(),
  page: z.int().positive(),
  pageSize: z.int().positive(),
})

export type ListConversationsResponse = z.infer<typeof listConversationsResponseSchema>

// vaultId is optional — ownership is enforced through the account, so the conversation id
// alone is enough; passing vaultId additionally scopes the lookup to that vault
export const getConversationRequestSchema = z.object({
  vaultId: z.int().positive().optional(),
  conversationId: z.int().positive(),
})

export type GetConversationRequest = z.infer<typeof getConversationRequestSchema>

export const getConversationResponseSchema = z.object({
  conversation: conversationDtoSchema,
  messages: z.array(conversationMessageDtoSchema),
})

export type GetConversationResponse = z.infer<typeof getConversationResponseSchema>

export const deleteConversationRequestSchema = getConversationRequestSchema

export type DeleteConversationRequest = z.infer<typeof deleteConversationRequestSchema>

// the streaming ask request — validated manually by the Koa SSE route, not a tRPC procedure
export const askRequestSchema = z.object({
  vaultId: z.int().positive(),
  // absent → start a new conversation
  conversationId: z.int().positive().optional(),
  question: z.string().trim().min(1, 'Enter a question').max(2000),
  mode: askModeSchema.default('local'),
})

export type AskRequest = z.infer<typeof askRequestSchema>

// SSE event payloads — shared by the API stream writer and the frontend parser
export const askStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('conversation'), conversationId: z.int().positive(), userMessageId: z.int().positive() }),
  z.object({ type: z.literal('citations'), citations: z.array(citationDtoSchema) }),
  z.object({ type: z.literal('token'), text: z.string() }),
  z.object({ type: z.literal('done'), messageId: z.int().positive() }),
  z.object({ type: z.literal('error'), message: z.string() }),
])

export type AskStreamEvent = z.infer<typeof askStreamEventSchema>
