import { Buffer } from 'node:buffer'
import { and, eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { AssetDto, UploadFileAssetRequest } from '@platform/components.contracts'
import { assets, vaults } from '@platform/components.domain'
import { createR2Client } from '@platform/integrations.cloudflare'
import { assetUploadedEvent, inngest } from '../../inngest/index.js'
import { toAssetDto } from './mappers.js'

export const assetsUpload: ApiHandler<UploadFileAssetRequest, AssetDto> = async (context) => {
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

  const [created] = await context.session.db.insert(assets).values({
    vaultId,
    source: 'file',
    name,
    contentType,
    sizeBytes: body.byteLength,
    status: 'pending',
  }).returning()

  const storageKey = `accounts/${accountId}/vaults/${vaultId}/assets/${created.id}`

  await createR2Client().put({ key: storageKey, body, contentType })

  const [uploaded] = await context.session.db.update(assets)
    .set({ storageKey, updatedAtUTC: new Date() })
    .where(eq(assets.id, created.id))
    .returning()

  // Start the asset uploaded workflow if the session commits successfully
  context.session.on('afterCommit', async () => {
    await inngest.send(assetUploadedEvent.create({ assetId: created.id }))
  })

  return context.event.response.created(toAssetDto(uploaded))
}
