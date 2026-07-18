import { GoogleGenAI } from '@google/genai'
import { serverConfiguration } from '@platform/components.configuration'
import { AppError } from '@platform/components.domain'

export const embeddingModel = 'gemini-embedding-001'

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
  const ai = new GoogleGenAI({ apiKey: serverConfiguration.gemini.apiKey })

  return {
    embedChunks: (texts: string[]): Promise<number[][]> => embed(ai, texts, 'RETRIEVAL_DOCUMENT'),

    // asymmetric retrieval: search queries are embedded with a different task type than documents
    embedQuery: async (text: string): Promise<number[]> => {
      const [embedding] = await embed(ai, [text], 'RETRIEVAL_QUERY')

      return embedding
    },
  }
}
