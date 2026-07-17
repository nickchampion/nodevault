import { execute, publicProcedure, router } from '@platform/components.api'
import { contactRequestSchema, okResponseSchema } from '@platform/components.contracts'
import { commsContact } from './contact.js'

export const commsRouter = router({
  contact: publicProcedure
    .input(contactRequestSchema)
    .output(okResponseSchema)
    .mutation(execute(commsContact)),
})
