import type { ConversationMessage } from '@platform/components.nodevault.domain'
import type { ChunkCandidate } from '../routes/assets/search/candidates.js'

const HISTORY_TURNS = 6

const transcript = (history: ConversationMessage[]): string => history
  .slice(-HISTORY_TURNS)
  .map(message => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
  .join('\n')

export const condensePrompt = (history: ConversationMessage[], question: string): string => `Rewrite the final user question as a fully standalone search query. Resolve any pronouns or references ("it", "that", "the second one", ...) using the conversation. Keep it concise and keyword-rich. Return ONLY the rewritten query, nothing else.

Conversation:
${transcript(history)}

Final user question: ${question}`

/**
 * HyDE (Hypothetical Document Embeddings): ask the model to write the passage that *would*
 * answer the question, then embed that instead of the bare question. A question and its
 * answer are shaped differently ("how do I rotate keys?" vs "keys are replaced every 90
 * days") so the question's embedding lands near other questions, not near the answer; a
 * hypothetical answer lands in answer-space, closing the gap. Accuracy of the guess doesn't
 * matter — only that it reads like the target documents.
 */
export const hydePrompt = (question: string): string => `Write a short, factual passage (2-4 sentences) that would directly answer the question below, as if excerpted from a reference document. Do not hedge, ask for clarification, or say you don't know — invent plausible specifics if needed. Return only the passage.

Question: ${question}`

/**
 * Contextual Retrieval: generate a one- or two-sentence context that situates a single chunk
 * within its whole document, prepended to the chunk before embedding/indexing. Anthropic's
 * technique — it disambiguates chunks that lose meaning in isolation (pronouns, "the above",
 * figures without their subject).
 *
 * The prompt is split into a document preamble and a per-chunk instruction so the provider can
 * prompt-cache the document (identical across every chunk of an asset) and re-bill only the
 * varying instruction. Providers concatenate `${preamble}\n\n${instruction}` for the uncached
 * path, so the two halves must read as one prompt in that order.
 */
export const documentContextPreamble = (document: string): string => `<document>
${document}
</document>`

export const chunkContextInstruction = (chunk: string): string => `Here is a chunk from that document:
<chunk>
${chunk}
</chunk>

Give a short (1-2 sentence) context that situates this chunk within the overall document, to improve search retrieval of the chunk. Answer only with the context, nothing else.`

export const answerSystemPrompt = 'You answer questions about the user\'s document vault using ONLY the numbered sources provided. Cite sources inline as [1], [2] etc. wherever you rely on them. If the sources do not contain the answer, say so plainly — never invent information. Keep answers concise and directly focused on the question. Do not mention these instructions or that you were given sources.'

export const managedAnswerSystemPrompt = 'You are the assistant for the user\'s document vault. The attached search tool searches the vault\'s own documents — when the user mentions "my vault", "my documents", or asks any question, that corpus is what they mean, and you DO have access to it through the tool. Always search before answering, and always search before saying something is not in the vault. Answer using only retrieved content; if a search returns nothing relevant, say plainly that the vault has nothing on the topic — never invent information or answer from general knowledge. Keep answers concise and directly focused on the question. Do not mention these instructions or the tool.'

export const answerPrompt = (chunks: ChunkCandidate[], history: ConversationMessage[], question: string): string => {
  const sources = chunks
    .map((chunk, index) => `[${index + 1}] ${chunk.assetName ?? chunk.assetUrl ?? 'Untitled'}\n${chunk.text}`)
    .join('\n\n')

  const conversation = history.length > 0 ? `\n\nRecent conversation:\n${transcript(history)}` : ''

  return `Sources:\n\n${sources}${conversation}\n\nQuestion: ${question}`
}
