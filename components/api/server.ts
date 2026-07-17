import Koa from 'koa'
import type { AnyRouter } from '@trpc/server'
import { nodeHTTPRequestHandler } from '@trpc/server/adapters/node-http'
import {
  Context,
  InboundEvent,
  type SessionFactory,
} from '@platform/components.context'
import { copyFields, Timer } from '@platform/components.utils'
import { createAuthInfoFromToken } from '@platform/components.utils.server'

export type ApiOptions = {
  port: number
  host?: string

  /** URL prefix the tRPC router is mounted under */
  prefix?: string

  /** Factory creating a database session per request context; defaults to no database */
  sessionFactory?: SessionFactory

  /** Extra Koa middleware mounted ahead of the tRPC handler; each must call next() for requests it doesn't handle */
  middleware?: Koa.Middleware[]
}

type KoaContext = Koa.ParameterizedContext<Koa.DefaultState, Koa.DefaultContext, any>

/**
 * The Api class hosts a tRPC router on a Koa web server. Koa handles CORS preflight and
 * anything outside the tRPC prefix; everything else is handed to the tRPC node adapter,
 * which routes the request to a procedure. Each request gets its own Context (with a
 * fresh database session) built in createContext below — procedure resolvers created via
 * `execute()` then run the ApiHandler through the middy lifecycle.
 */
export class Api {
  private options: ApiOptions
  private router: AnyRouter

  private settings = {
    methods: ['GET', 'DELETE', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'HEAD'],
    headers: [
      'authorization',
      'content-type',
      'accept-version',
      'x-authorization-refresh',
      'x-device-info',
      'x-version',
      'trpc-accept',
    ],
    responseHeaders: [
      'cf-lat',
      'cf-lon',
      'cf-country',
      'cf-timezone',
      'content-type',
      'accept-version',
      'cache-control',
      'x-elapsed',
      'x-api-version',
    ],
    prefix: '/trpc',
    allowOrigins: [] as string[],
    version: '',
    environment: 'dev',
  }

  handleUnhandledRejection = (error: Error) => {
    console.error(error)

    // exit process in local to raise awareness of this error
    if (this.settings.environment === 'dev') {
      console.error('handleUnhandledRejection')
      throw error
    }
  }

  constructor(
    options: ApiOptions,
    router: AnyRouter,
    origins: string[],
    version: string,
    environment: string,
  ) {
    this.options = options
    this.router = router
    this.settings.allowOrigins = origins
    this.settings.version = version
    this.settings.environment = environment
    this.settings.prefix = options.prefix ?? '/trpc'
  }

  // Access-Control-Allow-Origin must be a single value. Reflect the request
  // Origin back only if it appears in the allowlist; undefined otherwise.
  private resolveOrigin(origin: string | undefined): string | undefined {
    if (!origin) return undefined

    return this.settings.allowOrigins.find(o => o === origin)
  }

  /**
   * Start the api: create the Koa server and start listening.
   */
  async start() {
    try {
      const t = new Timer()

      const app = new Koa()

      // log unhandled rejections
      if (process.listeners('unhandledRejection').length <= 1) process.on('unhandledRejection', this.handleUnhandledRejection)

      this.configure(app)

      app.listen(this.options.port, this.options.host)

      console.log(`Server listening, port \u{1B}[33m${this.options.port}\u{1B}[0m in \u{1B}[32m${t.stop()}ms\u{1B}[0m`)
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  cors = (koa: KoaContext) => {
    const origin = this.resolveOrigin(koa.get('origin'))

    koa.status = 204

    if (origin) {
      koa.set('access-control-allow-origin', origin)
      koa.set('access-control-allow-credentials', 'true')
      koa.set('vary', 'Origin')
    }

    koa.set('access-control-allow-methods', this.settings.methods)
    koa.set('access-control-allow-headers', this.settings.headers.join(','))
    koa.set('access-control-expose-headers', this.settings.responseHeaders.join(','))
    koa.set('access-control-max-age', '7200')
    koa.set('content-type', 'text/plain charset=UTF-8')
    koa.set('content-length', '0')
  }

  /**
   * Build the per-request Context from the raw Node request. The auth token (when
   * present) is decoded into context.user here; procedure-level auth middleware then
   * enforces expiry and roles.
   */
  createContext = (koa: KoaContext): Context => {
    const queryKeys = Object.keys(koa.request.query)

    const event = new InboundEvent({
      query: copyFields(koa.query),
      path: koa.path,
      method: koa.method?.toLowerCase(),
      headers: copyFields(koa.headers),
      type: 'http',
      version: this.settings.version,
      clientVersion: (koa.headers['x-version'] || 'unknown').toString(),
      pathAndQuery:
        queryKeys.length > 0
          ? `${koa.path}?${queryKeys.map(key => `${key}=${koa.request.query[key]}`).join('&')}`
          : koa.path,
    })

    const context = new Context(event, this.options.sessionFactory)

    context.user = createAuthInfoFromToken(event.getAuthToken())

    return context
  }

  /**
   * Route all requests: CORS preflight is answered directly, anything under the tRPC
   * prefix is handed to the tRPC node adapter (which writes the response itself, so Koa
   * is told not to respond), the rest is a 404.
   */
  handleRoute = async (koa: KoaContext): Promise<void> => {
    if (koa.method?.toLowerCase() === 'options') {
      this.cors(koa)
      return
    }

    const prefix = `${this.settings.prefix}/`

    if (!koa.path.startsWith(prefix)) {
      koa.status = 404
      koa.body = {
        message: `Operation for given path was not found: ${koa.path}`,
        method: koa.request.method?.toLowerCase(),
        path: koa.request.path,
      }
      return
    }

    // the procedure path, e.g. /trpc/auth.login -> auth.login
    const path = koa.path.slice(prefix.length)

    // tRPC writes directly to the underlying response
    koa.respond = false

    // Koa pre-sets the raw status to 404; the tRPC adapter only applies its own status
    // when the raw response still holds the Node default (200), so reset it here
    koa.res.statusCode = 200

    await nodeHTTPRequestHandler({
      router: this.router,
      req: koa.req,
      res: koa.res,
      path,
      createContext: () => this.createContext(koa),
      responseMeta: ({ ctx }) => this.responseMeta(ctx, koa),
      onError: ({ error, path: procedure, ctx }) => {
        // handler-level errors are already logged by the context middleware; this
        // catches transport-level failures (parse errors, unknown procedures, ...)
        if (!ctx) console.error(`tRPC error on ${procedure ?? '<unknown>'}:`, error)
      },
    })
  }

  /**
   * Merge the headers accumulated on the context response (elapsed time, cache control,
   * geo spoofing, ...) with CORS and version headers into the tRPC response.
   */
  private responseMeta(context: Context | undefined, koa: KoaContext) {
    const headers: Record<string, string> = {}
    const origin = this.resolveOrigin(koa.get('origin'))

    if (origin) {
      headers['access-control-allow-origin'] = origin
      headers['access-control-allow-credentials'] = 'true'
      headers['vary'] = 'Origin'
    }

    headers['access-control-expose-headers'] = this.settings.responseHeaders.join(',')
    headers['x-api-version'] = this.settings.version || '1.0.0'

    if (context) {
      Object.entries(context.event.response.headers)
        // content type is owned by the tRPC transport (json vs jsonl streaming)
        .filter(([header]) => header.toLowerCase() !== 'content-type')
        .forEach(([header, value]) => {
          headers[header] = value
        })
    }

    return { headers }
  }

  configure = (app: Koa) => {
    this.options.middleware?.forEach(middleware => app.use(middleware))
    app.use(context => this.handleRoute(context))
  }
}
