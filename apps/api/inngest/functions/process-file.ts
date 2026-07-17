import { Buffer } from 'node:buffer'
import { NonRetriableError } from 'inngest'
import { and, eq, gte, lt } from 'drizzle-orm'
import { extractText, getDocumentProxy } from 'unpdf'
import mammoth from 'mammoth'
import { chunkText, partition } from '@platform/components.utils'
import { fileChunks, files } from '@platform/components.domain'
import { supportedContentTypeSchema } from '@platform/components.contracts'
import type { SupportedContentType } from '@platform/components.contracts'
import { createR2Client } from '@platform/integrations.cloudflare'
import { createGeminiClient, embeddingBatchSize } from '@platform/integrations.gemini'
import { fileUploadedEvent, inngest } from '../client.js'
import { withSession } from '../db.js'

const extractContent = async (bytes: Uint8Array<ArrayBuffer>, contentType: SupportedContentType): Promise<string> => {
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
 * files/file.uploaded → download from R2, extract text, chunk, embed with Gemini and
 * store vectors in file_chunks, then mark the file ready. Every step is its own unit
 * of work and idempotent (chunks are replaced wholesale), so retries are safe. Any
 * exhausted failure marks the file failed via onFailure.
 */
export const processFile = inngest.createFunction(
  {
    id: 'process-file',
    retries: 5,
    // headroom for Gemini free-tier rate limits — tune against the real account tier
    throttle: { limit: 2, period: '1m' },
    onFailure: async ({ event, error }) => {
      const { fileId } = event.data.event.data

      await withSession(async db => db.update(files)
        .set({ status: 'failed', error: error.message.slice(0, 1000), updatedAtUTC: new Date() })
        .where(eq(files.id, fileId)))
    },
    triggers: [fileUploadedEvent],
  },
  async ({ event, step }) => {
    const { fileId } = event.data

    const file = await step.run('load-and-validate', async () => {
      const row = await withSession(async db => db.query.files.findFirst({ where: eq(files.id, fileId) }))

      // the upload transaction commits after the event is sent — retry until the row is visible
      if (!row) throw new Error(`File ${fileId} is not visible yet`)

      // duplicate delivery of an already processed file — nothing to do
      if (row.status === 'ready') return null

      const contentType = supportedContentTypeSchema.safeParse(row.contentType)

      if (!row.storageKey || !contentType.success) {
        throw new NonRetriableError(`File ${fileId} cannot be processed (contentType ${row.contentType})`)
      }

      await withSession(async db => db.update(files)
        .set({ status: 'processing', error: null, updatedAtUTC: new Date() })
        .where(eq(files.id, fileId)))

      return { storageKey: row.storageKey, contentType: contentType.data }
    })

    if (!file) return { fileId, skipped: true }

    const { chunkCount } = await step.run('extract-and-store-chunks', async () => {
      const bytes = await createR2Client().get(file.storageKey)

      let content: string

      try {
        content = await extractContent(bytes, file.contentType)
      } catch (error) {
        throw new NonRetriableError(`Could not parse the file: ${(error as Error).message}`)
      }

      const chunks = chunkText(content)

      const rows = chunks.map((text, chunkIndex) => ({ fileId, chunkIndex, text }))

      // replace wholesale so retries and re-runs stay idempotent
      await withSession(async (db) => {
        await db.delete(fileChunks).where(eq(fileChunks.fileId, fileId))

        for (const group of partition(rows, 500)) {
          await db.insert(fileChunks).values(group)
        }
      })

      return { chunkCount: chunks.length }
    })

    // one step per batch: a Gemini rate limit only retries its own batch, and completed
    // batches are memoised across retries
    const batches = Math.ceil(chunkCount / embeddingBatchSize)

    for (let batch = 0; batch < batches; batch++) {
      await step.run(`embed-batch-${batch}`, async () => {
        const start = batch * embeddingBatchSize

        const rows = await withSession(async db => db
          .select({ id: fileChunks.id, text: fileChunks.text })
          .from(fileChunks)
          .where(and(
            eq(fileChunks.fileId, fileId),
            gte(fileChunks.chunkIndex, start),
            lt(fileChunks.chunkIndex, start + embeddingBatchSize),
          ))
          .orderBy(fileChunks.chunkIndex))

        if (rows.length === 0) return

        const embeddings = await createGeminiClient().embedChunks(rows.map(row => row.text))

        await withSession(async (db) => {
          for (const [index, row] of rows.entries()) {
            await db.update(fileChunks)
              .set({ embedding: embeddings[index] })
              .where(eq(fileChunks.id, row.id))
          }
        })
      })
    }

    await step.run('mark-ready', async () => withSession(async db => db.update(files)
      .set({ status: 'ready', error: null, updatedAtUTC: new Date() })
      .where(eq(files.id, fileId))))

    return { fileId, chunkCount }
  },
)
