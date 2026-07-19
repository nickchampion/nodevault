import { toUtcIso } from '@platform/components.utils'
import type { TopicDto } from '@platform/components.nodevault.contracts'
import type { Topic } from '@platform/components.nodevault.domain'

export const toTopicDto = (topic: Topic): TopicDto => ({
  id: topic.id,
  topic: topic.topic,
  status: topic.status,
  error: topic.error,
  createdAtUTC: toUtcIso(topic.createdAtUTC),
})
