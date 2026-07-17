import { createTRPCClient, httpLink } from '@trpc/client'
import type { AppRouter } from '@platform/apps.api'
import { appConfig } from './config'
import { getSession } from './auth'

/**
 * Typed tRPC client for the platform API. Procedure inputs and outputs are inferred
 * from the AppRouter type — no generated client or schemas to maintain.
 *
 * Usage: `await api.comms.contact.mutate({ ... })`
 */
export const api = (() => {
  const config = appConfig()

  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: `${config.api}/trpc`,
        headers: () => {
          const session = getSession()

          return {
            'x-version': config.version,
            ...(session?.tokens.access && { authorization: `Bearer ${session.tokens.access}` }),
          }
        },
      }),
    ],
  })
})()
