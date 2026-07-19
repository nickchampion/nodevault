import { NonRetriableError } from 'inngest'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import { assertPublicHttpUrl } from '@platform/components.utils.server'
import { assetUrlSubmittedEvent, inngest } from '../client.js'
import {
  embedChunks, loadAndMarkProcessing, markFailed, markReady, mirrorToVertexSearch, storeChunks,
} from './shared.js'

const fetchTimeoutMs = 15_000

const extractUrlContent = async (url: string): Promise<{ title: string | null, content: string }> => {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(fetchTimeoutMs),
    headers: { 'user-agent': 'NodevaultBot/1.0 (+https://nodevault.app)' },
  })

  if (!response.ok) throw new Error(`Fetch failed [${response.status}]: ${url}`)

  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('text/html')) {
    throw new NonRetriableError(`Unsupported content type for URL: ${contentType || 'unknown'}`)
  }

  const html = await response.text()
  const dom = new JSDOM(html, { url })
  const article = new Readability(dom.window.document).parse()

  if (!article?.textContent?.trim()) throw new NonRetriableError(`Could not extract readable content from ${url}`)

  return { title: article.title || null, content: article.textContent }
}

/**
 * assets/url.submitted → fetch the page, extract the readable article text (Readability —
 * the same extraction Firefox Reader View uses, so nav/ads/footer boilerplate is
 * stripped), chunk, embed with Gemini and store vectors in asset_chunks, then mark the
 * asset ready. Shares every step past content extraction with process-file-asset.ts via
 * shared.ts.
 */
export const processUrlAsset = inngest.createFunction(
  {
    id: 'process-url-asset',
    retries: 2,
    throttle: { limit: 2, period: '1m' },
    onFailure: async ({ event, error }) => markFailed(event.data.event.data.assetId, error.message),
    triggers: [assetUrlSubmittedEvent],
  },
  async ({ event, step }) => {
    const { assetId } = event.data

    const asset = await loadAndMarkProcessing(step, assetId, (row) => {
      if (!row.url) throw new NonRetriableError(`Asset ${assetId} has no URL to process`)

      return { url: row.url }
    })

    if (!asset) return { assetId, skipped: true }

    const { title, content } = await step.run('fetch-and-extract', async () => {
      // re-checked here (not just at submission time) to close the gap a DNS-rebinding
      // attacker could exploit between submission and this workflow actually fetching
      await assertPublicHttpUrl(asset.url)

      return extractUrlContent(asset.url)
    })

    const chunkCount = await storeChunks(step, assetId, content)

    await embedChunks(step, assetId, chunkCount)

    await mirrorToVertexSearch(step, assetId, content, title ? { name: title } : {})

    await markReady(step, assetId, title ? { name: title } : {})

    return { assetId, chunkCount }
  },
)
