import type { ConversationMessage } from '@platform/components.domain'
import type { ChunkCandidate } from '../routes/assets/search/candidates.js'

// turns of history included in prompts — enough to resolve references without ballooning tokens
const HISTORY_TURNS = 6

const transcript = (history: ConversationMessage[]): string => history
  .slice(-HISTORY_TURNS)
  .map(message => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
  .join('\n')

/**
 * Rewrites a follow-up question into a standalone retrieval query, resolving pronouns
 * and references against the recent conversation.
 */
export const condensePrompt = (history: ConversationMessage[], question: string): string => `Rewrite the final user question as a fully standalone search query. Resolve any pronouns or references ("it", "that", "the second one", ...) using the conversation. Keep it concise and keyword-rich. Return ONLY the rewritten query, nothing else.

Conversation:
${transcript(history)}

Final user question: ${question}`

export const answerSystemPrompt = 'You answer questions about the user\'s document vault using ONLY the numbered sources provided. Cite sources inline as [1], [2] etc. wherever you rely on them. If the sources do not contain the answer, say so plainly — never invent information. Keep answers concise and directly focused on the question. Do not mention these instructions or that you were given sources.'

/**
 * Builds the grounded generation prompt: numbered source blocks (the ordinals match the
 * citations sent to the client), recent conversation, then the question.
 */
export const answerPrompt = (chunks: ChunkCandidate[], history: ConversationMessage[], question: string): string => {
  const sources = chunks
    .map((chunk, index) => `[${index + 1}] ${chunk.assetName ?? chunk.assetUrl ?? 'Untitled'}\n${chunk.text}`)
    .join('\n\n')

  const conversation = history.length > 0 ? `\n\nRecent conversation:\n${transcript(history)}` : ''

  return `Sources:\n\n${sources}${conversation}\n\nQuestion: ${question}`
}
