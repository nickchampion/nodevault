import { desc, eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { ListTopicsResponse } from '@platform/components.nodevault.contracts'
import { topics } from '@platform/components.nodevault.domain'
import { toTopicDto } from './mappers.js'

export const topicsList: ApiHandler<unknown, ListTopicsResponse> = async (context) => {
  const userId = context.user?.userId

  if (!userId) return context.event.response.unauthorised()

  const rows = await context.session.db.query.topics.findMany({
    where: eq(topics.userId, userId),
    orderBy: desc(topics.createdAtUTC),
  })

  return context.event.response.ok({
    topics: rows.map(toTopicDto),
  })
}
