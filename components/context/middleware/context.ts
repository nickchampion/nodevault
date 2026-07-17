import { serverConfiguration } from '@platform/components.configuration'
import { normalizeError } from '@platform/components.domain'
import type { Context } from '../index.js'
import type { IMiddleware } from '../types/index.js'

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete'])

/**
 * Core request lifecycle middleware. Owns the unit of work: a transaction is opened
 * before any mutating handler runs and committed here after it completes, so a handler
 * either persists all of its writes or none of them. Errors (and vetoed sessions) roll
 * the transaction back.
 */
export const contextMiddleware = (): IMiddleware => {
  const before = async (context: Context): Promise<void> => {
    context.props['start'] = Date.now()

    // open the unit of work: every statement a mutating handler runs joins this
    // transaction; read-only handlers query the pool directly
    if (MUTATING_METHODS.has(context.event.method)) {
      context.session.begin()
    }

    // Bind request-scoped fields onto the logger once. Every log call from the
    // handler (and from the error middleware below) carries them automatically.
    // cf-ray is set by Cloudflare; fall back to x-request-id or a generated id.
    const headers = context.event?.headers ?? {}
    const requestId = headers['cf-ray'] ?? headers['x-request-id'] ?? crypto.randomUUID()

    context.log = context.log.with({
      requestId,
      path: context.event?.path,
      method: context.event?.method,
      ...(context.user?.accountId && { accountId: context.user.accountId }),
    })
  }

  const after = async (context: Context): Promise<void> => {
    const setResponseHeaders = () => {
      if (!context.event.response?.headers) {
        return
      }

      // Spoof Cloudflare headers in local
      if (serverConfiguration.environment.environment !== 'dev') {
        context.event.response.headers['Cf-Lat'] = '51.75368'
        context.event.response.headers['Cf-Lon'] = '-0.44975'
        context.event.response.headers['Cf-Country'] = 'GB'
        context.event.response.headers['Cf-Timezone'] = 'London/Europe'
      }

      context.event.response.headers['x-elapsed'] = `${Date.now() - +context.props['start']}ms`
    }

    // close the unit of work: a handler that responded with a client error (or vetoed
    // the session) must not persist anything
    if (context.event.response?.statusCode >= 400 || context.session.veto) {
      await context.session.rollback()
    } else {
      await context.session.commit()
    }

    setResponseHeaders()
  }

  const error = async (context: Context): Promise<void> => {
    // a failed handler must not persist partial writes
    await context.session.rollback()

    // Wrap the thrown value once so downstream code (response builder, listeners,
    // session error hooks) can rely on AppError shape and stop type-sniffing.
    const error_ = normalizeError(context.error)

    context.error = error_

    // Log every handler error to Workers Logs. Client errors (4xx) at warn,
    // genuine server faults (5xx) at error so they're easy to alert/filter on.
    const level = error_.statusCode >= 500 ? 'error' : 'warn'

    context.log[level](`Handler failed: ${error_.message}`, error_, {
      path: context.event?.path,
      method: context.event?.method,
    })

    // if an error occurs during execution of a handler we may have compensation logic we need to execute.
    // This is often handled in a session commit error event, but this flow does not cater for all use cases
    await context.emit('error')
  }

  return {
    before,
    after,
    error,
  }
}
