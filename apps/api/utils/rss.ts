import Parser from 'rss-parser'
import { maxRssItems } from '@platform/components.nodevault.contracts'
import { assertPublicHttpUrl } from '@platform/components.utils.server'

const fetchTimeoutMs = 15_000

const parser = new Parser()

export type RssFeedItem = {
  link: string
  title: string | null
  publishedAtUTC: string | null
}

export type RssFeed = {
  title: string | null
  items: RssFeedItem[]
}

/**
 * Fetch and parse an RSS/Atom feed, returning at most maxRssItems items, most recent
 * first. Shared by the create-from-RSS handler (initial import) and the weekly
 * sync-rss-vaults workflow (incremental polling) — both just need "what's in the feed
 * right now", deduping against existing assets is the caller's job.
 */
export const fetchRssFeed = async (feedUrl: string): Promise<RssFeed> => {
  await assertPublicHttpUrl(feedUrl)

  const response = await fetch(feedUrl, {
    redirect: 'follow',
    signal: AbortSignal.timeout(fetchTimeoutMs),
    headers: { 'user-agent': 'NodevaultBot/1.0 (+https://nodevault.app)' },
  })

  if (!response.ok) throw new Error(`Feed fetch failed [${response.status}]: ${feedUrl}`)

  const xml = await response.text()
  const feed = await parser.parseString(xml)

  const seen = new Set<string>()
  const items: RssFeedItem[] = []

  for (const item of feed.items) {
    const link = item.link?.trim()

    if (!link || seen.has(link)) continue

    seen.add(link)
    items.push({
      link,
      title: item.title?.trim() || null,
      publishedAtUTC: item.isoDate ?? null,
    })
  }

  // feeds are conventionally already newest-first; this only reorders one that isn't
  // (items missing a date keep their relative feed order via a stable sort)
  items.sort((a, b) => (a.publishedAtUTC && b.publishedAtUTC ? b.publishedAtUTC.localeCompare(a.publishedAtUTC) : 0))

  return {
    title: feed.title?.trim() || null,
    items: items.slice(0, maxRssItems),
  }
}
