import { z } from 'zod'

export const topicStatusSchema = z.enum(['pending', 'ready', 'failed'])

export type TopicStatus = z.infer<typeof topicStatusSchema>

export const createTopicRequestSchema = z.object({
  topic: z.string().trim()
    .min(3, 'Describe the topic in at least 3 characters')
    .max(200, 'Topic must be 200 characters or fewer'),
})

export type CreateTopicRequest = z.infer<typeof createTopicRequestSchema>

export const deleteTopicRequestSchema = z.object({
  topicId: z.int().positive(),
})

export type DeleteTopicRequest = z.infer<typeof deleteTopicRequestSchema>

export const topicCreatedEventSchema = z.object({
  topicId: z.int().positive(),
})

export type TopicCreatedEvent = z.infer<typeof topicCreatedEventSchema>

export const topicDtoSchema = z.object({
  id: z.int().positive(),
  topic: z.string(),
  status: topicStatusSchema,
  error: z.string().nullable(),
  createdAtUTC: z.iso.datetime(),
})

export const listTopicsResponseSchema = z.object({
  topics: z.array(topicDtoSchema),
})

export type TopicDto = z.infer<typeof topicDtoSchema>
export type ListTopicsResponse = z.infer<typeof listTopicsResponseSchema>
