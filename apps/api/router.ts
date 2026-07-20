import { router } from '@platform/components.api'
import {
  accountRouter, assetsRouter, authRouter, commsRouter, conversationsRouter, systemRouter, topicsRouter, vaultsRouter,
} from './routes/index.js'

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
