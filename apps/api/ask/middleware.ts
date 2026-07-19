import type Koa from 'koa'
import { and, eq } from 'drizzle-orm'
import { serverConfiguration } from '@platform/components.configuration.server'
import { InboundEvent } from '@platform/components.context'
import { createAuthInfoFromToken } from '@platform/components.utils.server'
import { isExpired } from '@platform/components.utils'
import { askRequestSchema } from '@platform/components.nodevault.contracts'
import { accounts, conversations, vaults } from '@platform/components.nodevault.domain'
import { withSession } from '../db.js'
import { aiAccessDeniedMessage, hasAiAccess } from '../ai.js'
import { runAskPipeline } from './pipeline.js'
import { createSseWriter } from './sse.js'

// reflect the request origin only when allowlisted — the SSE response bypasses the tRPC
// responseMeta that normally sets CORS headers, so they're applied here on every outcome
const resolveOrigin = (context: Koa.Context): string | undefined => serverConfiguration.origins.find(origin => origin === context.get('origin'))

const respondJson = (context: Koa.Context, status: number, body: Record<string, unknown>) => {
  const origin = resolveOrigin(context)

  if (origin) {
    context.set('access-control-allow-origin', origin)
    context.set('access-control-allow-credentials', 'true')
    context.set('vary', 'Origin')
  }

  context.status = status
  context.body = body
}

/**
 * Serves POST /ask/stream — the RAG ask endpoint. It streams tokens over SSE, which the
 * single-Response tRPC lifecycle can't do, so it runs as raw Koa middleware (same
 * pattern as the Inngest handler): auth, validation, and ownership checks respond with
 * plain JSON before any stream bytes; after that the response is an SSE event stream.
 * OPTIONS falls through to the standard CORS preflight handling.
 */
export const askMiddleware: Koa.Middleware = async (context, next) => {
  if (context.path !== '/ask/stream' || context.method !== 'POST') return next()

  const user = createAuthInfoFromToken(InboundEvent.getAuthToken({ authorization: context.get('authorization') }))

  if (!user.accountId || isExpired(user.expiresAtUTC)) {
    return respondJson(context, 401, { message: 'Unauthorised' })
  }

  let raw = ''

  for await (const chunk of context.req) raw += chunk

  let body: unknown

  try {
    body = JSON.parse(raw)
  } catch {
    return respondJson(context, 400, { message: 'Invalid JSON body' })
  }

  const parsed = askRequestSchema.safeParse(body)

  if (!parsed.success) {
    return respondJson(context, 400, {
      message: 'Validation failed',
      validation: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
    })
  }

  const {
    vaultId, conversationId, question, mode,
  } = parsed.data

  const { owned, aiUsable, deniedMessage } = await withSession(async (db) => {
    const vault = await db.query.vaults.findFirst({
      columns: { id: true },
      where: and(eq(vaults.id, vaultId), eq(vaults.accountId, user.accountId!)),
    })

    if (!vault) return { owned: false, aiUsable: false, deniedMessage: null }

    const account = await db.query.accounts.findFirst({ where: eq(accounts.id, user.accountId!) })
    const usable = Boolean(account && hasAiAccess(account))
    const message = account ? aiAccessDeniedMessage(account) : null

    if (!conversationId) return { owned: true, aiUsable: usable, deniedMessage: message }

    const conversation = await db.query.conversations.findFirst({
      columns: { id: true },
      where: and(eq(conversations.id, conversationId), eq(conversations.vaultId, vaultId)),
    })

    return { owned: Boolean(conversation), aiUsable: usable, deniedMessage: message }
  })

  if (!owned) return respondJson(context, 404, { message: 'Not found' })

  // fail before the stream opens — the client gets a plain JSON error it can surface
  if (!aiUsable) return respondJson(context, 400, { message: deniedMessage ?? 'AI provider not configured' })

  // from here the response is a stream — Koa must not write its own response
  context.respond = false

  const origin = resolveOrigin(context)

  context.res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
    // tell buffering proxies to pass events through as they're written
    'x-accel-buffering': 'no',
    ...(origin && {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      vary: 'Origin',
    }),
  })

  // flush headers immediately so the client sees the stream open before the first token
  context.res.write(':ok\n\n')

  const abort = new AbortController()

  context.req.on('close', () => abort.abort())

  const writer = createSseWriter(context.res)

  try {
    await runAskPipeline({
      accountId: user.accountId!, vaultId, conversationId, question, mode, writer, signal: abort.signal,
    })
  } catch (error) {
    console.error('ask pipeline failed:', error)
    writer.send({ type: 'error', message: 'Something went wrong generating the answer' })
  } finally {
    writer.end()
  }
}
