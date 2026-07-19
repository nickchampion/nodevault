import type { ApiHandler } from '@platform/components.context'
import type { CreateTopicRequest, TopicDto } from '@platform/components.nodevault.contracts'
import { topics } from '@platform/components.nodevault.domain'
import { inngest, topicCreatedEvent } from '../../inngest/index.js'
import { toTopicDto } from './mappers.js'

export const topicCreate: ApiHandler<CreateTopicRequest, TopicDto> = async (context) => {
  const userId = context.user?.userId

  if (!userId) return context.event.response.unauthorised()

  const topic = context.event.payload.topic.trim()

  const [created] = await context.session.db
    .insert(topics)
    .values({ userId, topic, status: 'pending' })
    .returning()

  // embedding requires a Gemini call, kept out of this request's transaction
  context.session.on('afterCommit', async () => {
    await inngest.send(topicCreatedEvent.create({ topicId: created.id }))
  })

  return context.event.response.created(toTopicDto(created))
}
