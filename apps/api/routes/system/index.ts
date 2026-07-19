import { execute, publicProcedure, router } from '@platform/components.api'
import { pingResponseSchema } from '@platform/components.nodevault.contracts'
import { systemPing } from './ping.js'

export const systemRouter = router({
  ping: publicProcedure
    .output(pingResponseSchema)
    .query(execute(systemPing)),
})
