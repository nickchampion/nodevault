import OpenAI from 'openai'
import { AppError } from '@platform/components.nodevault.domain'

/**
 * Per-account OpenRouter access: an *additive* generation override. OpenRouter is a
 * chat-completions gateway with no embeddings, so the account's base provider still does
 * ingestion + retrieval — this client only streams the final answer from a user-chosen
 * model. It is OpenAI-API-compatible, so we reuse the OpenAI SDK pointed at OpenRouter's
 * base URL (mirrors integrations/openai's client shape).
 */
export type OpenRouterClientConfig = {
  apiKey: string
}

export const baseUrl = 'https://openrouter.ai/api/v1'

type OpenRouterErrorBody = { message?: unknown, metadata?: { raw?: unknown } }

const openRouterErrorMessage = (error: unknown): string => {
  const candidate = error as { error?: OpenRouterErrorBody } & OpenRouterErrorBody
  const body = candidate?.error ?? candidate
  const raw = body?.metadata?.raw
  const message = body?.message

  if (typeof raw === 'string' && raw.trim()) return raw.trim()

  if (typeof message === 'string' && message.trim()) return message.trim()

  return 'OpenRouter could not generate an answer. Please try again or pick a different model.'
}

export type OpenRouterModel = {
  id: string
  name: string
  contextLength: number | null
  promptPrice: string | null
  completionPrice: string | null
}

type OpenRouterModelRow = {
  id: string
  name?: string
  context_length?: number | null
  architecture?: { output_modalities?: string[] }
  pricing?: { prompt?: string, completion?: string }
}

const toModel = (row: OpenRouterModelRow): OpenRouterModel => ({
  id: row.id,
  name: row.name ?? row.id,
  contextLength: row.context_length ?? null,
  promptPrice: row.pricing?.prompt ?? null,
  completionPrice: row.pricing?.completion ?? null,
})

const isTextModel = (row: OpenRouterModelRow): boolean => {
  const outputs = row.architecture?.output_modalities

  return !outputs || outputs.includes('text')
}

const isFreeModel = (model: OpenRouterModel): boolean => (
  model.promptPrice !== null && model.completionPrice !== null
  && Number(model.promptPrice) === 0 && Number(model.completionPrice) === 0
)

const byFreeThenName = (left: OpenRouterModel, right: OpenRouterModel): number => {
  const freeDelta = Number(isFreeModel(right)) - Number(isFreeModel(left))

  return freeDelta === 0 ? left.name.localeCompare(right.name) : freeDelta
}

export const createOpenRouterClient = ({ apiKey }: OpenRouterClientConfig) => {
  const client = new OpenAI({ apiKey, baseURL: baseUrl })

  return {
    verifyApiKey: async (): Promise<void> => {
      const response = await fetch(`${baseUrl}/key`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      if (!response.ok) {
        throw new AppError('validation', 'OpenRouter rejected this API key')
      }
    },

    generateAnswerStream: async function* (
      model: string,
      systemInstruction: string,
      prompt: string,
      signal?: AbortSignal,
    ): AsyncGenerator<string> {
      try {
        const stream = await client.chat.completions.create({
          model,
          temperature: 0.2,
          stream: true,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt },
          ],
        }, { signal })

        for await (const chunk of stream) {
          const chunkError = (chunk as { error?: unknown }).error

          if (chunkError) throw new AppError('internal', `OpenRouter: ${openRouterErrorMessage(chunk)}`)

          const delta = chunk.choices[0]?.delta?.content

          if (delta) yield delta
        }
      } catch (error) {
        if (signal?.aborted || error instanceof AppError) throw error

        throw new AppError('internal', `OpenRouter: ${openRouterErrorMessage(error)}`)
      }
    },
  }
}

export const listOpenRouterModels = async (): Promise<OpenRouterModel[]> => {
  const response = await fetch(`${baseUrl}/models`)

  if (!response.ok) {
    throw new AppError('internal', `OpenRouter models request failed (${response.status})`)
  }

  const body = await response.json() as { data?: OpenRouterModelRow[] }
  const rows = body.data ?? []

  return rows
    .filter(isTextModel)
    .map(toModel)
    .sort(byFreeThenName)
}

export type OpenRouterClient = ReturnType<typeof createOpenRouterClient>
