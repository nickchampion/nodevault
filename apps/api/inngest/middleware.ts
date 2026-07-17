import type Koa from 'koa'
import { serve } from 'inngest/koa'
import { functions, inngest } from './index.js'

const handler = serve({ client: inngest, functions })

/**
 * Serves the Inngest endpoint at /api/inngest. The body is read here as a raw string
 * (inngest JSON-parses strings itself) so no global body parser is needed — the tRPC
 * routes keep their untouched request stream. OPTIONS falls through to the standard
 * CORS preflight handling.
 */
export const inngestMiddleware: Koa.Middleware = async (context, next) => {
  if (context.path !== '/api/inngest' || context.method === 'OPTIONS') return next()

  if (context.method !== 'GET') {
    let raw = ''

    for await (const chunk of context.req) raw += chunk
    ;(context.request as { body?: unknown }).body = raw
  }

  return handler(context)
}
