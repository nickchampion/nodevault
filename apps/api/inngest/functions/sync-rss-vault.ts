import { eq } from 'drizzle-orm'
import { assets, vaults } from '@platform/components.nodevault.domain'
import { assetUrlSubmittedEvent, inngest, rssVaultSyncRequestedEvent } from '../client.js'
import { withSession } from '../../utils/db.js'
import { fetchRssFeed } from '../../utils/rss.js'

export const syncRssVault = inngest.createFunction(
  {
    id: 'sync-rss-vault',
    retries: 2,
    throttle: { limit: 10, period: '1m' },
    triggers: [rssVaultSyncRequestedEvent],
  },
  async ({ event, step }) => {
    const { vaultId } = event.data

    const newAssetIds = await step.run('sync-vault', async () => {
      const vault = await withSession(async db => db.query.vaults.findFirst({ where: eq(vaults.id, vaultId) }))

      if (!vault?.rssFeedUrl) return []

      const feed = await fetchRssFeed(vault.rssFeedUrl)

      return withSession(async (db) => {
        const existing = await db
          .select({ url: assets.url })
          .from(assets)
          .where(eq(assets.vaultId, vaultId))

        const seenUrls = new Set(existing.map(row => row.url))
        const newItems = feed.items.filter(item => !seenUrls.has(item.link))

        const inserted = newItems.length > 0
          ? await db.insert(assets).values(newItems.map(item => ({
            vaultId, source: 'url' as const, url: item.link, name: item.title, status: 'pending' as const,
          }))).returning({ id: assets.id })
          : []

        await db.update(vaults)
          .set({ rssLastPolledAtUTC: new Date() })
          .where(eq(vaults.id, vaultId))

        return inserted.map(row => row.id)
      })
    })

    if (newAssetIds.length > 0) {
      await step.sendEvent('notify-new-assets', newAssetIds.map(assetId => assetUrlSubmittedEvent.create({ assetId })))
    }

    return { vaultId, assetsCreated: newAssetIds.length }
  },
)
