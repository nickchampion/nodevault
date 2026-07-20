import { eq, inArray, sql } from 'drizzle-orm'
import { conversationMessages, conversations, assets } from '@platform/components.nodevault.domain'
import type { ConversationMessage } from '@platform/components.nodevault.domain'
import type { AskMode, CitationDto } from '@platform/components.nodevault.contracts'
import type { AiClient } from '../utils/ai/client.js'
import { aiClientForAccount } from '../utils/ai/client.js'
import { withSession } from '../utils/db.js'
import { hybridChunkCandidates } from '../routes/assets/search/candidates.js'
import {
  answerPrompt, answerSystemPrompt, condensePrompt, managedAnswerSystemPrompt,
} from './prompts.js'
import type { SseWriter } from './sse.js'

const TITLE_MAX_LENGTH = 80
const RAG_CHUNK_LIMIT = 8
const HISTORY_LIMIT = 10
const NO_SOURCES_ANSWER = "I couldn't find anything in this vault relevant to that question."

export type AskPipelineArgs = {
  accountId: number
  vaultId: number
  conversationId?: number
  question: string
  mode: AskMode
  writer: SseWriter
  signal: AbortSignal
}

type GenerationArgs = {
  ai: AiClient
  vaultId: number
  history: ConversationMessage[]
  question: string
  writer: SseWriter
  signal: AbortSignal
}

type Generated = { answer: string, citations: CitationDto[] }

/**
 * The ask flow: persist the question, generate a streamed answer through the selected
 * retrieval stack, persist the result. 'local' condenses the question and stuffs
 * pgvector chunks into the prompt; 'vertex' hands retrieval to the Vertex AI Search
 * grounding tool. DB access happens in short withSession transactions so no connection
 * is held across a Gemini call; the vault (and any conversationId) has already been
 * ownership-checked by the middleware.
 */
export const runAskPipeline = async ({
  accountId, vaultId, conversationId, question, mode, writer, signal,
}: AskPipelineArgs): Promise<void> => {
  const ai = await withSession(async db => aiClientForAccount(db, accountId))

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

  const args: GenerationArgs = {
    ai, vaultId, history, question, writer, signal,
  }
  const generated = mode === 'managed' ? await generateManagedAnswer(args) : await generateLocalAnswer(args)

  if (!generated || signal.aborted) return

  const [assistantMessage] = await withSession(async (db) => {
    const inserted = await db
      .insert(conversationMessages)
      .values({
        conversationId: conversation.id,
        role: 'assistant',
        content: generated.answer,
        citations: generated.citations,
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

const generateLocalAnswer = async ({
  ai, vaultId, history, question, writer, signal,
}: GenerationArgs): Promise<Generated | null> => {
  const condensed = await condenseQuestion(ai, history, question)

  const queryEmbedding = await ai.embedQuery(condensed)
  const chunks = await withSession(async db => hybridChunkCandidates(db, vaultId, condensed, queryEmbedding, RAG_CHUNK_LIMIT))

  const citations: CitationDto[] = chunks.map((chunk, index) => ({
    ordinal: index + 1,
    assetId: chunk.assetId,
    assetName: chunk.assetName,
    assetUrl: chunk.assetUrl,
    source: chunk.source,
    chunkIndex: chunk.chunkIndex,
  }))

  writer.send({ type: 'citations', citations })

  if (signal.aborted) return null

  if (chunks.length === 0) {
    writer.send({ type: 'token', text: NO_SOURCES_ANSWER })

    return { answer: NO_SOURCES_ANSWER, citations }
  }

  let answer = ''

  try {
    const stream = ai.generateAnswerStream(answerSystemPrompt, answerPrompt(chunks, history, question), signal)

    for await (const text of stream) {
      answer += text
      writer.send({ type: 'token', text })
    }
  } catch (error) {
    if (signal.aborted) return null

    throw error
  }

  return { answer, citations }
}

const generateManagedAnswer = async ({
  ai, vaultId, history, question, writer, signal,
}: GenerationArgs): Promise<Generated | null> => {
  let answer = ''
  const groundedAssetIds: number[] = []

  try {
    const stream = ai.generateManagedAnswerStream(managedAnswerSystemPrompt, history, question, vaultId, signal)

    for await (const part of stream) {
      if (part.text) {
        answer += part.text
        writer.send({ type: 'token', text: part.text })
      }

      const newlyGrounded = part.groundedAssetIds ?? []

      for (const assetId of newlyGrounded) {
        if (!groundedAssetIds.includes(assetId)) groundedAssetIds.push(assetId)
      }
    }
  } catch (error) {
    if (signal.aborted) return null

    throw error
  }

  if (!answer.trim()) {
    answer = NO_SOURCES_ANSWER
    writer.send({ type: 'token', text: answer })
  }

  const citations = await citationsForAssets(groundedAssetIds)

  writer.send({ type: 'citations', citations })

  return { answer, citations }
}

/** Vertex grounding names documents, not chunks — rebuild citation details from the asset rows. */
const citationsForAssets = async (assetIds: number[]): Promise<CitationDto[]> => {
  if (assetIds.length === 0) return []

  const rows = await withSession(async db => db.query.assets.findMany({
    columns: {
      id: true, name: true, url: true, source: true,
    },
    where: inArray(assets.id, assetIds),
  }))

  const byId = new Map(rows.map(row => [row.id, row]))

  return assetIds
    .filter(assetId => byId.has(assetId))
    .map((assetId, index) => {
      const row = byId.get(assetId)!

      return {
        ordinal: index + 1,
        assetId,
        assetName: row.name,
        assetUrl: row.url,
        source: row.source,
        chunkIndex: null,
      }
    })
}

/**
 * A follow-up like "what else does it say?" retrieves poorly verbatim — rewrite it into
 * a standalone query using the conversation. First questions skip the extra LLM call,
 * and any condensation failure falls back to the raw question.
 */
const condenseQuestion = async (ai: AiClient, history: ConversationMessage[], question: string): Promise<string> => {
  if (history.length === 0) return question

  try {
    const generated = await ai.generateText(condensePrompt(history, question))
    const condensed = generated.trim()

    return condensed || question
  } catch {
    return question
  }
}
