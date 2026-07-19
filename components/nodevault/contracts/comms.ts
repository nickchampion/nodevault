import { z } from 'zod'
import { phoneSchema } from './common.js'

export const contactRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.email('Enter a valid email address'),
  phone: phoneSchema.optional(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
  interests: z.array(z.string()).default([]),
})

export type ContactRequest = z.infer<typeof contactRequestSchema>
