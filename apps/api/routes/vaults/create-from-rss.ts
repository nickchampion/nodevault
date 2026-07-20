import { and, eq, sql } from 'drizzle-orm'
import type { ApiHandler, DatabaseClient } from '@platform/components.context'
import type { CreateVaultFromRssRequest, VaultDto } from '@platform/components.nodevault.contracts'
import { AppError, assets, vaults } from '@platform/components.nodevault.domain'
import { assetUrlSubmittedEvent, inngest } from '../../inngest/index.js'
import { aiClientForAccount } from '../../utils/ai/client.js'
import { fetchRssFeed } from '../../utils/rss.js'
import { toVaultDto } from './mappers.js'

const maxNameLength = 50

const deriveVaultName = (feedTitle: string | null, feedUrl: string): string => {
  const base = (feedTitle || new URL(feedUrl).hostname).trim()

  return base.length > 0 ? base.slice(0, maxNameLength) : 'RSS vault'
}

/** Append " (2)", " (3)", ... to a machine-derived name until it clears the account's unique-name index. */
const uniqueVaultName = async (db: DatabaseClient, accountId: number, base: string): Promise<string> => {
  let candidate = base

  for (let suffix = 2; suffix <= 50; suffix++) {
    const existing = await db.query.vaults.findFirst({
      columns: { id: true },
      where: and(eq(vaults.accountId, accountId), sql`lower(${vaults.name}) = ${candidate.toLowerCase()}`),
    })

    if (!existing) return candidate

    const suffixText = ` (${suffix})`

    candidate = `${base.slice(0, maxNameLength - suffixText.length)}${suffixText}`
  }

  throw new AppError('conflict', 'Could not find a unique vault name for this feed')
}

/**
 * Creates a vault from an RSS/Atom feed: fetches the feed once (up to maxRssItems,
 * most recent first), creates the vault with rssFeedUrl set so sync-rss-vaults.ts picks
 * it up weekly, then queues every item as a pending 'url' asset — actual fetch/extract/
 * embed happens in process-url-asset.ts, same as a manually submitted URL.
 */
export const vaultCreateFromRss: ApiHandler<CreateVaultFromRssRequest, VaultDto> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  // ingestion embeds and mirrors through the account's own AI provider — fail fast
  // here rather than letting the background workflow die without credentials
  await aiClientForAccount(context.session.db, accountId)

  const { feedUrl } = context.event.payload

  let feed

  try {
    feed = await fetchRssFeed(feedUrl)
  } catch (error) {
    throw new AppError('validation', `Could not read that RSS feed: ${(error as Error).message}`)
  }

  if (feed.items.length === 0) {
    throw new AppError('validation', 'This feed has no articles to import')
  }

  const name = await uniqueVaultName(context.session.db, accountId, deriveVaultName(feed.title, feedUrl))

  const [vault] = await context.session.db
    .insert(vaults)
    .values({
      accountId, name, rssFeedUrl: feedUrl, rssLastPolledAtUTC: new Date(),
    })
    .returning()

  const createdAssets = await context.session.db
    .insert(assets)
    .values(feed.items.map(item => ({
      vaultId: vault.id, source: 'url' as const, url: item.link, name: item.title, status: 'pending' as const,
    })))
    .returning()

  context.session.on('afterCommit', async () => {
    await Promise.all(createdAssets.map(asset => inngest.send(assetUrlSubmittedEvent.create({ assetId: asset.id }))))
  })

  return context.event.response.created(toVaultDto(vault, {
    documentCount: 0, urlCount: createdAssets.length, conversationCount: 0,
  }))
}
