import { router } from '@platform/components.api'
import { authRouter, commsRouter, systemRouter } from './routes/index.js'

/**
 * The application router: one router per routes/ subdirectory, merged here under its
 * domain namespace (procedures are exposed as `<domain>.<procedure>`, e.g. auth.login).
 * Each domain router bridges its ApiHandlers onto procedures via execute(), which runs
 * them through the middy lifecycle (logging, session commit, error handling). Inputs are
 * validated by zod before the handler runs — the parsed input becomes
 * `context.event.payload`.
 */
export const appRouter = router({
  auth: authRouter,
  comms: commsRouter,
  system: systemRouter,
})

export type AppRouter = typeof appRouter
