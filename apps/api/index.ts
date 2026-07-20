import { serverConfiguration } from '@platform/components.configuration.server'
import { Api } from '@platform/components.api'
import { PgSession } from '@platform/components.postgres'
import { schema } from '@platform/components.nodevault.domain'
import { pool } from './utils/db.js'
import { appRouter } from './router.js'
import { inngestMiddleware } from './inngest/middleware.js'
import { askMiddleware } from './ask/middleware.js'

/**
 * Local/production web server hosting the application tRPC router. Procedures are
 * exposed under the /trpc prefix, e.g. POST /trpc/auth.login
 */
const start = async () => {
  const api = new Api(
    {
      host: serverConfiguration.dev ? 'api.nodevault.local' : undefined,
      port: 8002,
      sessionFactory: () => new PgSession(pool, schema),
      middleware: [inngestMiddleware, askMiddleware],
    },
    appRouter,
    serverConfiguration.origins,
    serverConfiguration.version,
    String(serverConfiguration.environment.environment),
  )

  await api.start()
}

start()
