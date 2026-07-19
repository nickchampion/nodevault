import { GoogleGenAI } from '@google/genai'
import { serverConfiguration } from '@platform/components.configuration.server'
import { AppError } from '@platform/components.domain'

export const embeddingModel = 'gemini-embedding-001'

export const generationModel = 'gemini-2.5-flash'

// small/fast model for utility calls (query condensation) — quality matters less than latency
export const condensationModel = 'gemini-2.5-flash-lite'

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

export const createGeminiClient = () => {
  const { project, location, credentials } = serverConfiguration.gemini

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
