import { z } from 'zod'

export const pingResponseSchema = z.object({
  status: z.string(),
})

export type PingResponse = z.infer<typeof pingResponseSchema>
