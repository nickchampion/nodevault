import { eq, sql } from 'drizzle-orm'
import { conversationMessages, conversations } from '@platform/components.domain'
import type { ConversationMessage } from '@platform/components.domain'
import { createGeminiClient } from '@platform/integrations.gemini'
import type { CitationDto } from '@platform/components.contracts'
import { withSession } from '../db.js'
import { hybridChunkCandidates } from '../routes/assets/search/candidates.js'
import { answerPrompt, answerSystemPrompt, condensePrompt } from './prompts.js'
import type { SseWriter } from './sse.js'

const TITLE_MAX_LENGTH = 80
const RAG_CHUNK_LIMIT = 8
const HISTORY_LIMIT = 10
const NO_SOURCES_ANSWER = "I couldn't find anything in this vault relevant to that question."

export type AskPipelineArgs = {
  vaultId: number
  conversationId?: number
  question: string
  writer: SseWriter
  signal: AbortSignal
}

/**
 * The RAG ask flow: persist the question → condense it against history → retrieve
 * grounding chunks → stream the answer → persist it. DB access happens in short
 * withSession transactions so no connection is held across a Gemini call; the vault
 * (and any conversationId) has already been ownership-checked by the middleware.
 */
export const runAskPipeline = async ({
  vaultId, conversationId, question, writer, signal,
}: AskPipelineArgs): Promise<void> => {
  const gemini = createGeminiClient()

  const { conversation, userMessage, history } = await withSession(async (db) => {
    const existing = conversationId
      ? await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) })
      : undefined

    const [row] = existing
      ? [existing]
      : await db
        .insert(conversations)
        .values({ vaultId, title: question.slice(0, TITLE_MAX_LENGTH) })
        .returning()

    const allMessages = existing
      ? await db.query.conversationMessages.findMany({
        where: eq(conversationMessages.conversationId, row.id),
        orderBy: conversationMessages.id,
      })
      : []

    const priorMessages = allMessages.slice(-HISTORY_LIMIT)

    const [inserted] = await db
      .insert(conversationMessages)
      .values({ conversationId: row.id, role: 'user', content: question })
      .returning()

    await db
      .update(conversations)
      .set({ updatedAtUTC: sql`now()` })
      .where(eq(conversations.id, row.id))

    return { conversation: row, userMessage: inserted, history: priorMessages }
  })

  writer.send({ type: 'conversation', conversationId: conversation.id, userMessageId: userMessage.id })

  if (signal.aborted) return

  const condensed = await condenseQuestion(gemini, history, question)

  const queryEmbedding = await gemini.embedQuery(condensed)
  const chunks = await withSession(db => hybridChunkCandidates(db, vaultId, condensed, queryEmbedding, RAG_CHUNK_LIMIT))

  const citations: CitationDto[] = chunks.map((chunk, index) => ({
    ordinal: index + 1,
    assetId: chunk.assetId,
    assetName: chunk.assetName,
    assetUrl: chunk.assetUrl,
    source: chunk.source,
    chunkIndex: chunk.chunkIndex,
  }))

  writer.send({ type: 'citations', citations })

  if (signal.aborted) return

  let answer = ''

  if (chunks.length === 0) {
    answer = NO_SOURCES_ANSWER
    writer.send({ type: 'token', text: answer })
  } else {
    try {
      const stream = gemini.generateAnswerStream(answerSystemPrompt, answerPrompt(chunks, history, question), signal)

      for await (const text of stream) {
        answer += text
        writer.send({ type: 'token', text })
      }
    } catch (error) {
      // client went away mid-generation: stop quietly, persist nothing further
      if (signal.aborted) return

      throw error
    }
  }

  if (signal.aborted) return

  const [assistantMessage] = await withSession(async (db) => {
    const inserted = await db
      .insert(conversationMessages)
      .values({
        conversationId: conversation.id,
        role: 'assistant',
        content: answer,
        citations: chunks.length > 0 ? citations : [],
      })
      .returning()

    await db
      .update(conversations)
      .set({ updatedAtUTC: sql`now()` })
      .where(eq(conversations.id, conversation.id))

    return inserted
  })

  writer.send({ type: 'done', messageId: assistantMessage.id })
}

/**
 * A follow-up like "what else does it say?" retrieves poorly verbatim — rewrite it into
 * a standalone query using the conversation. First questions skip the extra LLM call,
 * and any condensation failure falls back to the raw question.
 */
const condenseQuestion = async (gemini: ReturnType<typeof createGeminiClient>, history: ConversationMessage[], question: string): Promise<string> => {
  if (history.length === 0) return question

  try {
    const generated = await gemini.generateText(condensePrompt(history, question))
    const condensed = generated.trim()

    return condensed || question
  } catch {
    return question
  }
}
