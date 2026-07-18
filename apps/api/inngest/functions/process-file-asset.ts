import { Buffer } from 'node:buffer'
import { NonRetriableError } from 'inngest'
import { extractText, getDocumentProxy } from 'unpdf'
import mammoth from 'mammoth'
import { supportedContentTypeSchema } from '@platform/components.contracts'
import type { SupportedContentType } from '@platform/components.contracts'
import { createR2Client } from '@platform/integrations.cloudflare'
import { assetFileUploadedEvent, inngest } from '../client.js'
import {
  embedChunks, loadAndMarkProcessing, markFailed, markReady, storeChunks,
} from './shared.js'

const extractFileContent = async (bytes: Uint8Array<ArrayBuffer>, contentType: SupportedContentType): Promise<string> => {
  switch (contentType) {
    case 'text/plain':

    case 'text/markdown': {
      return new TextDecoder().decode(bytes)
    }

    case 'application/pdf': {
      const { text } = await extractText(await getDocumentProxy(bytes), { mergePages: true })

      return text
    }

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })

      return value
    }
  }
}

/**
 * assets/asset.uploaded → download from R2, extract text, chunk, embed with Gemini and
 * store vectors in asset_chunks, then mark the asset ready. Every step is its own unit
 * of work and idempotent (chunks are replaced wholesale), so retries are safe. Any
 * exhausted failure marks the asset failed via onFailure. Shares every step past content
 * extraction with process-url-asset.ts via shared.ts.
 */
export const processFileAsset = inngest.createFunction(
  {
    id: 'process-file-asset',
    retries: 2,
    throttle: { limit: 2, period: '1m' },
    onFailure: async ({ event, error }) => markFailed(event.data.event.data.assetId, error.message),
    triggers: [assetFileUploadedEvent],
  },
  async ({ event, step }) => {
    const { assetId } = event.data

    const asset = await loadAndMarkProcessing(step, assetId, (row) => {
      const contentType = supportedContentTypeSchema.safeParse(row.contentType)

      if (!row.storageKey || !contentType.success) {
        throw new NonRetriableError(`Asset ${assetId} cannot be processed (contentType ${row.contentType})`)
      }

      return { storageKey: row.storageKey, contentType: contentType.data }
    })

    if (!asset) return { assetId, skipped: true }

    const content = await step.run('download-and-extract', async () => {
      const bytes = await createR2Client().get(asset.storageKey)

      try {
        return await extractFileContent(bytes, asset.contentType)
      } catch (error) {
        throw new NonRetriableError(`Could not parse the file: ${(error as Error).message}`)
      }
    })

    const chunkCount = await storeChunks(step, assetId, content)

    await embedChunks(step, assetId, chunkCount)

    await markReady(step, assetId)

    return { assetId, chunkCount }
  },
)
