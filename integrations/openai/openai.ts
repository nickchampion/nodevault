import { createHash } from 'node:crypto'
import OpenAI, { toFile } from 'openai'
import type {
  ResponseInput, ResponseInputItem, ResponseOutputItem, ResponseOutputMessage,
} from 'openai/resources/responses/responses'
import { serverConfiguration } from '@platform/components.configuration.server'
import { AppError } from '@platform/components.nodevault.domain'

/**
 * Per-account OpenAI access: every client is built from the owning account's own
 * (decrypted) API key — mirrors GcpClientConfig's shape (see integrations/gemini).
 */
export type OpenAiClientConfig = {
  apiKey: string
}

export const embeddingModel = 'text-embedding-3-small'

export const generationModel = 'gpt-4.1-mini'

// small/fast model for utility calls (query condensation) — quality matters less than latency
export const condensationModel = 'gpt-4.1-nano'

// matches Gemini's embeddingDimensions (integrations/gemini) so both providers share the
// same asset_chunks/topics pgvector column without a schema change — text-embedding-3-small
// supports truncating its native 1536-dim output via Matryoshka representation learning
export const embeddingDimensions = 768

// chunks per embeddings.create call — tune against the account's OpenAI rate limits
export const embeddingBatchSize = 16

export type OpenAiClient = ReturnType<typeof createOpenAiClient>

const environmentPrefix = () => serverConfiguration.environment.environment

/** Deterministic filename baked into the uploaded file — the round-trip key for citations. */
const assetFilename = (assetId: number) => `${environmentPrefix()}-asset-${assetId}.txt`

/** Parses an assetId back out of a file_search citation's filename (mirrors assetIdFromDocumentPath in integrations/vertexsearch). */
export const assetIdFromFilename = (filename: string | undefined): number | undefined => {
  const match = filename?.match(/^(?:\w+-)?asset-(\d+)\.txt$/)

  return match ? Number(match[1]) : undefined
}

const assetIdsFromContent = (content: ResponseOutputMessage['content']): number[] => content
  .filter(part => part.type === 'output_text')
  .flatMap(part => part.annotations)
  .filter(annotation => annotation.type === 'file_citation')
  .map(annotation => assetIdFromFilename(annotation.filename))
  .filter((id): id is number => id !== undefined)

/** Resolves file_citation annotations on a completed response's message output back to asset ids, deduped. */
const groundedAssetIdsFromOutput = (output: ResponseOutputItem[]): number[] => {
  const assetIds = output
    .filter(item => item.type === 'message')
    .flatMap(item => assetIdsFromContent(item.content))

  return [...new Set(assetIds)]
}

/** file_search attribute filter isolating a single vault's files (mirrors vaultFilter in integrations/vertexsearch). */
export const vaultFilter = (vaultId: number) => ({ type: 'eq' as const, key: 'vaultId', value: vaultId })

export type OpenAiAssetDocument = {
  assetId: number
  vaultId: number
  source: 'file' | 'url'
  name: string | null
  url: string | null
  text: string
  // the vector-store file id from a previous upsert, if any — replaced (not merely added
  // to) so re-ingestion stays idempotent, same intent as Vertex's INCREMENTAL import
  existingFileId: string | null
}

export const createOpenAiClient = ({ apiKey }: OpenAiClientConfig) => {
  const client = new OpenAI({ apiKey })

  return {
    embedChunks: async (texts: string[]): Promise<number[][]> => {
      const response = await client.embeddings.create({
        model: embeddingModel,
        input: texts,
        dimensions: embeddingDimensions,
      })

      if (response.data.length !== texts.length) {
        throw new AppError('internal', `OpenAI returned ${response.data.length} embeddings for ${texts.length} inputs`)
      }

      return response.data.map((embedding) => {
        if (!embedding.embedding?.length) throw new AppError('internal', 'OpenAI returned an empty embedding')

        return embedding.embedding
      })
    },

    embedQuery: async (text: string): Promise<number[]> => {
      const response = await client.embeddings.create({
        model: embeddingModel,
        input: [text],
        dimensions: embeddingDimensions,
      })

      const [embedding] = response.data

      if (!embedding?.embedding?.length) throw new AppError('internal', 'OpenAI returned an empty embedding')

      return embedding.embedding
    },

    // small non-streamed utility call (e.g. condensing a follow-up question into a
    // standalone search query)
    generateText: async (prompt: string): Promise<string> => {
      const response = await client.responses.create({
        model: condensationModel,
        input: prompt,
        temperature: 0,
      })

      return response.output_text ?? ''
    },

    /**
     * Contextual Retrieval context generation. OpenAI caches identical prompt prefixes
     * automatically (prefixes over ~1024 tokens), and the document preamble leads every chunk's
     * prompt, so after the first call the document tokens are served from cache at a discount.
     * A `prompt_cache_key` derived from the document routes the whole batch to the same cache to
     * maximise the hit rate. Per-chunk failures yield null.
     */
    generateChunkContexts: async (documentPreamble: string, chunkInstructions: string[]): Promise<(string | null)[]> => {
      if (chunkInstructions.length === 0) return []

      const cacheKey = `ctx-${createHash('sha256').update(documentPreamble).digest('hex').slice(0, 32)}`
      const contexts: (string | null)[] = []

      for (const instruction of chunkInstructions) {
        try {
          const response = await client.responses.create({
            model: condensationModel,
            input: `${documentPreamble}\n\n${instruction}`,
            temperature: 0,
            prompt_cache_key: cacheKey,
          })

          const text = response.output_text?.trim()

          contexts.push(text || null)
        } catch {
          contexts.push(null)
        }
      }

      return contexts
    },

    generateAnswerStream: async function* (systemInstruction: string, prompt: string, signal?: AbortSignal): AsyncGenerator<string> {
      const stream = await client.responses.create({
        model: generationModel,
        instructions: systemInstruction,
        input: prompt,
        temperature: 0.2,
        stream: true,
      }, { signal })

      for await (const event of stream) {
        if (event.type === 'response.output_text.delta') yield event.delta
      }
    },

    // multi-turn generation grounded on the account's OpenAI vector store: file_search is
    // attached as a tool scoped to this vault (via a vaultId attribute filter), the model
    // derives its own retrieval queries, and citations are read off the completed
    // response's file_citation annotations, resolved back to asset ids via the filename
    // convention set at upload time (assetFilename).
    generateManagedAnswerStream: async function* (
      systemInstruction: string,
      history: ResponseInputItem[],
      vectorStoreId: string,
      vaultId: number,
      signal?: AbortSignal,
    ): AsyncGenerator<{ text?: string, groundedAssetIds?: number[] }> {
      const stream = await client.responses.create({
        model: generationModel,
        instructions: systemInstruction,
        input: history as ResponseInput,
        temperature: 0.2,
        stream: true,
        tools: [{
          type: 'file_search',
          vector_store_ids: [vectorStoreId],
          filters: vaultFilter(vaultId),
        }],
      }, { signal })

      for await (const event of stream) {
        if (event.type === 'response.output_text.delta') {
          yield { text: event.delta }
        } else if (event.type === 'response.completed') {
          const grounded = groundedAssetIdsFromOutput(event.response.output)

          if (grounded.length > 0) yield { groundedAssetIds: grounded }
        }
      }
    },

    /**
     * Credential verification probe: a cheap, side-effect-free call that exercises the
     * key's validity without spending on generation/embeddings.
     */
    verifyApiKey: async (): Promise<void> => {
      await client.models.list()
    },

    /** Creates the account's vector store on first connection; a no-op-safe id thereafter. */
    ensureVectorStore: async (): Promise<string> => {
      const store = await client.vectorStores.create({ name: `nodevault-${environmentPrefix()}` })

      return store.id
    },

    /** Re-probes an already-created vector store (e.g. on key rotation). */
    verifyVectorStore: async (vectorStoreId: string): Promise<void> => {
      await client.vectorStores.retrieve(vectorStoreId)
    },

    /**
     * Upsert = replace: delete any previous file for this asset (best-effort, swallows
     * not-found) then upload+attach a fresh one. Returns the new file id for the caller
     * to persist (assets.openaiFileId) so the next upsert/delete can find it again — an
     * OpenAI vector-store file id is opaque and assigned by OpenAI, unlike Vertex's
     * deterministic per-asset document id, so it has to be round-tripped through storage.
     */
    upsertAssetFile: async (vectorStoreId: string, asset: OpenAiAssetDocument): Promise<string> => {
      if (asset.existingFileId) {
        await deleteVectorStoreFile(client, asset.existingFileId, vectorStoreId)
      }

      const uploaded = await client.files.create({
        file: await toFile(Buffer.from(asset.text, 'utf8'), assetFilename(asset.assetId)),
        purpose: 'assistants',
      })

      await client.vectorStores.files.create(vectorStoreId, {
        file_id: uploaded.id,
        attributes: {
          vaultId: asset.vaultId,
          assetId: asset.assetId,
          source: asset.source,
          ...(asset.name && { name: asset.name }),
          ...(asset.url && { url: asset.url }),
        },
      })

      return uploaded.id
    },

    deleteAssetFile: async (vectorStoreId: string, fileId: string): Promise<void> => {
      await deleteVectorStoreFile(client, fileId, vectorStoreId)
    },
  }
}

const deleteVectorStoreFile = async (client: OpenAI, fileId: string, vectorStoreId: string | undefined): Promise<void> => {
  try {
    if (vectorStoreId) await client.vectorStores.files.delete(fileId, { vector_store_id: vectorStoreId })

    await client.files.delete(fileId)
  } catch (error) {
    // already gone (never attached, or deleted twice) — deletion is idempotent
    if ((error as { status?: number }).status === 404) return

    throw error
  }
}
