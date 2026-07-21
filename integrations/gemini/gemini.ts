import { GoogleGenAI } from '@google/genai'
import type { Content, GroundingMetadata } from '@google/genai'
import { AppError } from '@platform/components.nodevault.domain'

/**
 * Per-account GCP access: every client is built from the owning account's own project
 * and (decrypted) service-account key — there are no platform-level credentials.
 */
export type GcpClientConfig = {
  project: string
  location: string

  /** plaintext service-account key JSON (decrypted by the caller) */
  credentials: string
}

export const embeddingModel = 'gemini-embedding-001'

export const generationModel = 'gemini-2.5-flash'

// small/fast model for utility calls (query condensation) — quality matters less than latency
export const condensationModel = 'gemini-2.5-flash-lite'

// TTL for the per-document explicit cache used by Contextual Retrieval — long enough to
// outlast the run of chunk calls for one asset, short enough that storage cost is trivial
export const contextCacheTtl = '600s'

// 768 keeps vectors comfortably under pgvector's 2000-dimension HNSW index limit
export const embeddingDimensions = 768

// chunks per embedContent call — tune against the account's Gemini rate limits
export const embeddingBatchSize = 16

export type GeminiClient = ReturnType<typeof createGeminiClient>

/**
 * Reduced-dimensionality embeddings are not pre-normalised by the API — normalise to
 * unit length so cosine/inner-product similarity behaves.
 */
const normalise = (values: number[]): number[] => {
  const magnitude = Math.hypot(...values)

  if (magnitude === 0) return values

  return values.map(value => value / magnitude)
}

type TaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'

const embed = async (ai: GoogleGenAI, texts: string[], taskType: TaskType): Promise<number[][]> => {
  const response = await ai.models.embedContent({
    model: embeddingModel,
    contents: texts,
    config: {
      taskType,
      outputDimensionality: embeddingDimensions,
    },
  })

  const embeddings = response.embeddings ?? []

  if (embeddings.length !== texts.length) {
    throw new AppError('internal', `Gemini returned ${embeddings.length} embeddings for ${texts.length} inputs`)
  }

  return embeddings.map((embedding) => {
    if (!embedding.values?.length) throw new AppError('internal', 'Gemini returned an empty embedding')

    return normalise(embedding.values)
  })
}

export const createGeminiClient = ({ project, location, credentials }: GcpClientConfig) => {
  const credentialsJson = JSON.parse(credentials)

  const ai = new GoogleGenAI({
    vertexai: true,
    project,
    location,
    googleAuthOptions: { credentials: credentialsJson },
  })

  // generation models aren't published on every regional Vertex endpoint (europe-west2
  // 404s for gemini-2.5-*) — generation goes through the global endpoint instead, while
  // embeddings stay on the configured region
  const generationAi = new GoogleGenAI({
    vertexai: true,
    project,
    location: 'global',
    googleAuthOptions: { credentials: credentialsJson },
  })

  return {
    embedChunks: (texts: string[]): Promise<number[][]> => embed(ai, texts, 'RETRIEVAL_DOCUMENT'),

    // asymmetric retrieval: search queries are embedded with a different task type than documents
    embedQuery: async (text: string): Promise<number[]> => {
      const [embedding] = await embed(ai, [text], 'RETRIEVAL_QUERY')

      return embedding
    },

    // small non-streamed utility call (e.g. condensing a follow-up question into a
    // standalone search query) — thinking disabled for latency
    generateText: async (prompt: string): Promise<string> => {
      const response = await generationAi.models.generateContent({
        model: condensationModel,
        contents: prompt,
        config: {
          temperature: 0,
          thinkingConfig: { thinkingBudget: 0 },
        },
      })

      return response.text ?? ''
    },

    /**
     * Contextual Retrieval context generation with explicit prompt caching. The document
     * preamble is written once to a cached-content resource; each chunk call then references
     * the cache and sends only its own instruction, so the (large, identical) document tokens
     * are billed once for the whole asset instead of once per chunk. Caching is best-effort:
     * documents below the model's cacheable-token minimum (or a region that rejects the cache)
     * fall back to sending the full preamble+instruction inline. Per-chunk failures yield null.
     */
    generateChunkContexts: async (documentPreamble: string, chunkInstructions: string[]): Promise<(string | null)[]> => {
      if (chunkInstructions.length === 0) return []

      const config = { temperature: 0, thinkingConfig: { thinkingBudget: 0 } }

      let cacheName: string | undefined

      try {
        const cache = await generationAi.caches.create({
          model: condensationModel,
          config: { contents: documentPreamble, ttl: contextCacheTtl },
        })

        cacheName = cache.name
      } catch {
        // document too small to cache, or caching unavailable on this endpoint — inline instead
      }

      try {
        const contexts: (string | null)[] = []

        for (const instruction of chunkInstructions) {
          try {
            const response = await generationAi.models.generateContent({
              model: condensationModel,
              contents: cacheName ? instruction : `${documentPreamble}\n\n${instruction}`,
              config: cacheName ? { ...config, cachedContent: cacheName } : config,
            })

            const text = response.text?.trim()

            contexts.push(text || null)
          } catch {
            contexts.push(null)
          }
        }

        return contexts
      } finally {
        if (cacheName) {
          try {
            await generationAi.caches.delete({ name: cacheName })
          } catch {
            // best-effort cleanup — the cache expires on its TTL regardless
          }
        }
      }
    },

    // multi-turn generation grounded on a Vertex AI Search data store: the model derives
    // retrieval queries from the conversation itself, so no manual condense/retrieve step.
    // Yields text as it streams plus any grounding metadata carried on a chunk.
    generateGroundedAnswerStream: async function* (
      systemInstruction: string,
      contents: Content[],
      datastore: string,
      filter: string,
      signal?: AbortSignal,
    ): AsyncGenerator<{ text?: string, grounding?: GroundingMetadata }> {
      const stream = await generationAi.models.generateContentStream({
        model: generationModel,
        contents,
        config: {
          systemInstruction,
          temperature: 0.2,
          abortSignal: signal,
          tools: [{ retrieval: { vertexAiSearch: { datastore, filter } } }],
        },
      })

      for await (const chunk of stream) {
        const grounding = chunk.candidates?.[0]?.groundingMetadata

        if (chunk.text || grounding) yield { text: chunk.text, grounding }
      }
    },

    generateAnswerStream: async function* (systemInstruction: string, prompt: string, signal?: AbortSignal): AsyncGenerator<string> {
      const stream = await generationAi.models.generateContentStream({
        model: generationModel,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
          abortSignal: signal,
        },
      })

      for await (const chunk of stream) {
        if (chunk.text) yield chunk.text
      }
    },
  }
}
