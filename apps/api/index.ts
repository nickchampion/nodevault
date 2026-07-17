import { serverConfiguration } from '@platform/components.configuration'
import { Api } from '@platform/components.api'
import { PgSession, createPool } from '@platform/components.postgres'
import { schema } from '@platform/components.domain'
import { appRouter } from './router.js'
import { inngestMiddleware } from './inngest/middleware.js'

/**
 * Local/production web server hosting the application tRPC router. Procedures are
 * exposed under the /trpc prefix, e.g. POST /trpc/auth.login
 */
const start = async () => {
  // one pool per process; each request Context gets its own unit-of-work session
  const pool = createPool(serverConfiguration.postgres)

  const api = new Api(
    {
      host: serverConfiguration.dev ? 'api.nodevault.local' : undefined,
      port: 8002,
      sessionFactory: () => new PgSession(pool, schema),
      middleware: [inngestMiddleware],
    },
    appRouter,
    serverConfiguration.origins,
    serverConfiguration.version,
    String(serverConfiguration.environment.environment),
  )

  await api.start()
}

start()
