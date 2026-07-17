import { Buffer } from 'node:buffer'
import { and, eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { FileDto, UploadFileRequest } from '@platform/components.contracts'
import { files, vaults } from '@platform/components.domain'
import { createR2Client } from '@platform/integrations.cloudflare'
import { fileUploadedEvent, inngest } from '../../inngest/index.js'
import { toFileDto } from './mappers.js'

export const filesUpload: ApiHandler<UploadFileRequest, FileDto> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const {
    vaultId, name, contentType, content,
  } = context.event.payload

  const vault = await context.session.db.query.vaults.findFirst({
    columns: { id: true },
    where: and(eq(vaults.id, vaultId), eq(vaults.accountId, accountId)),
  })

  if (!vault) return context.event.response.notFound()

  const body = new Uint8Array(Buffer.from(content, 'base64'))

  const [created] = await context.session.db.insert(files).values({
    vaultId,
    source: 'upload',
    name,
    contentType,
    sizeBytes: body.byteLength,
    status: 'pending',
  }).returning()

  const storageKey = `accounts/${accountId}/vaults/${vaultId}/files/${created.id}`

  // a failure here throws, rolling the inserted row back with the transaction
  await createR2Client().put({ key: storageKey, body, contentType })

  // the file stays pending — the workflow moves it processing → ready
  const [uploaded] = await context.session.db.update(files)
    .set({ storageKey, updatedAtUTC: new Date() })
    .where(eq(files.id, created.id))
    .returning()

  // Start the file uploaded workflow if the session commits successfully
  context.session.on('afterCommit', async () => {
    await inngest.send(fileUploadedEvent.create({ fileId: created.id }))
  })

  return context.event.response.created(toFileDto(uploaded))
}
