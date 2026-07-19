import { and, eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { AssetDto, SubmitUrlAssetRequest } from '@platform/components.nodevault.contracts'
import { AppError, assets, vaults } from '@platform/components.nodevault.domain'
import { assertPublicHttpUrl } from '@platform/components.utils.server'
import { assetUrlSubmittedEvent, inngest } from '../../inngest/index.js'
import { gcpForAccount } from '../../gcp.js'
import { toAssetDto } from './mappers.js'

export const assetsSubmitUrl: ApiHandler<SubmitUrlAssetRequest, AssetDto> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  // ingestion embeds and mirrors through the account's own GCP project — fail fast
  // here rather than letting the background workflow die without credentials
  await gcpForAccount(context.session.db, accountId)

  const { vaultId, url } = context.event.payload

  const vault = await context.session.db.query.vaults.findFirst({
    columns: { id: true },
    where: and(eq(vaults.id, vaultId), eq(vaults.accountId, accountId)),
  })

  if (!vault) return context.event.response.notFound()

  try {
    await assertPublicHttpUrl(url)
  } catch (error) {
    throw new AppError('validation', (error as Error).message)
  }

  const [created] = await context.session.db.insert(assets).values({
    vaultId,
    source: 'url',
    url,
    status: 'pending',
  }).returning()

  context.session.on('afterCommit', async () => {
    await inngest.send(assetUrlSubmittedEvent.create({ assetId: created.id }))
  })

  return context.event.response.created(toAssetDto(created))
}
