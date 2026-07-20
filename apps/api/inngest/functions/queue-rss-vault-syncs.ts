import { cron } from 'inngest'
import { isNotNull } from 'drizzle-orm'
import { vaults } from '@platform/components.nodevault.domain'
import { inngest, rssVaultSyncRequestedEvent } from '../client.js'
import { withSession } from '../../utils/db.js'

export const queueRssVaultSyncs = inngest.createFunction(
  {
    id: 'queue-rss-vault-syncs',
    retries: 2,
    triggers: [cron('TZ=UTC 0 6 * * 1')],
  },
  async ({ step }) => {
    const vaultIds = await step.run('list-rss-vaults', () => withSession(async (db) => {
      const rows = await db
        .select({ id: vaults.id })
        .from(vaults)
        .where(isNotNull(vaults.rssFeedUrl))

      return rows.map(row => row.id)
    }))

    if (vaultIds.length > 0) {
      await step.sendEvent('queue-vault-syncs', vaultIds.map(vaultId => rssVaultSyncRequestedEvent.create({ vaultId })))
    }

    return { vaultsQueued: vaultIds.length }
  },
)
