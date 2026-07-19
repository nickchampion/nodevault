import { eq } from 'drizzle-orm'
import { createGeminiClient } from '@platform/integrations.gemini'
import { topics, users } from '@platform/components.nodevault.domain'
import { topicCreatedEvent, inngest } from '../client.js'
import { withSession } from '../db.js'
import { gcpForAccount } from '../../gcp.js'

const markTopicFailed = async (topicId: number, message: string): Promise<void> => {
  await withSession(async db => db.update(topics)
    .set({ status: 'failed', error: message.slice(0, 1000), updatedAtUTC: new Date() })
    .where(eq(topics.id, topicId)))
}

/**
 * topics/topic.created → embed the saved topic phrase with Gemini (the account's own
 * project, same as asset ingestion) and store the vector so process-url-asset.ts /
 * process-file-asset.ts can match new content against it via matchTopics in shared.ts.
 */
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

      // the creating transaction commits after the event is sent — retry until visible
      if (!row) throw new Error(`Topic ${topicId} is not visible yet`)

      // duplicate delivery of an already-embedded topic — nothing to do
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
      const gcp = await withSession(async db => gcpForAccount(db, topic.accountId))
      const embedding = await createGeminiClient(gcp).embedQuery(topic.text)

      await withSession(async db => db.update(topics)
        .set({
          embedding, status: 'ready', error: null, updatedAtUTC: new Date(),
        })
        .where(eq(topics.id, topicId)))
    })

    return { topicId }
  },
)
