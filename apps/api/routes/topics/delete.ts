import { and, eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { DeleteTopicRequest, OkResponse } from '@platform/components.nodevault.contracts'
import { topics } from '@platform/components.nodevault.domain'

export const topicDelete: ApiHandler<DeleteTopicRequest, OkResponse> = async (context) => {
  const userId = context.user?.userId

  if (!userId) return context.event.response.unauthorised()

  const { topicId } = context.event.payload

  const topic = await context.session.db.query.topics.findFirst({
    columns: { id: true },
    where: and(eq(topics.id, topicId), eq(topics.userId, userId)),
  })

  if (!topic) return context.event.response.notFound()

  // topic_matches reference topics with onDelete: 'cascade' — deleting the topic removes them too
  await context.session.db.delete(topics).where(eq(topics.id, topicId))

  return context.event.response.ok()
}
