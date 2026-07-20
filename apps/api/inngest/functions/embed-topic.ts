import { eq } from 'drizzle-orm'
import { topics, users } from '@platform/components.nodevault.domain'
import { topicCreatedEvent, inngest } from '../client.js'
import { withSession } from '../../utils/db.js'
import { aiClientForAccount } from '../../utils/ai/client.js'

const markTopicFailed = async (topicId: number, message: string): Promise<void> => {
  await withSession(async db => db.update(topics)
    .set({ status: 'failed', error: message.slice(0, 1000), updatedAtUTC: new Date() })
    .where(eq(topics.id, topicId)))
}

export const embedTopic = inngest.createFunction(
  {
    id: 'embed-topic',
    retries: 2,
    onFailure: async ({ event, error }) => markTopicFailed(event.data.event.data.topicId, error.message),
    triggers: [topicCreatedEvent],
  },
  async ({ event, step }) => {
    const { topicId } = event.data

    const topic = await step.run('load-topic', () => withSession(async (db) => {
      const row = await db.query.topics.findFirst({
        where: eq(topics.id, topicId),
      })

      if (!row) throw new Error(`Topic ${topicId} is not visible yet`)

      if (row.status === 'ready') return null

      const owner = await db.query.users.findFirst({
        columns: { accountId: true },
        where: eq(users.id, row.userId),
      })

      if (!owner) throw new Error(`Topic ${topicId}'s owning user is not visible yet`)

      return { text: row.topic, accountId: owner.accountId }
    }))

    if (!topic) return { topicId, skipped: true }

    await step.run('embed-and-store', async () => {
      const ai = await withSession(async db => aiClientForAccount(db, topic.accountId))
      const embedding = await ai.embedQuery(topic.text)

      await withSession(async db => db.update(topics)
        .set({
          embedding, status: 'ready', error: null, updatedAtUTC: new Date(),
        })
        .where(eq(topics.id, topicId)))
    })

    return { topicId }
  },
)
