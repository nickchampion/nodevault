import { router } from '@platform/components.api'
import {
  accountRouter, assetsRouter, authRouter, commsRouter, conversationsRouter, systemRouter, topicsRouter, vaultsRouter,
} from './routes/index.js'

/**
 * The application router: one router per routes/ subdirectory, merged here under its
 * domain namespace (procedures are exposed as `<domain>.<procedure>`, e.g. auth.login).
 * Each domain router bridges its ApiHandlers onto procedures via execute(), which runs
 * them through the middy lifecycle (logging, session commit, error handling). Inputs are
 * validated by zod before the handler runs — the parsed input becomes
 * `context.event.payload`.
 */
export const appRouter = router({
  account: accountRouter,
  assets: assetsRouter,
  auth: authRouter,
  comms: commsRouter,
  conversations: conversationsRouter,
  system: systemRouter,
  topics: topicsRouter,
  vaults: vaultsRouter,
})

export type AppRouter = typeof appRouter
