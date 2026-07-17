import { PgSession } from '@platform/components.postgres'
import { schema } from '@platform/components.domain'
import type { DatabaseClient } from '@platform/components.context'
import { pool } from '../db.js'

/**
 * Unit of work for Inngest steps. Functions run outside the request lifecycle (no
 * context.session, no middy transaction), so each step wraps its DB access in its own
 * short-lived transactional session. Never hold a session across steps — retries may
 * replay on a different execution.
 */
export const withSession = async <T>(work: (db: DatabaseClient) => Promise<T>): Promise<T> => {
  const session = new PgSession(pool, schema)

  session.begin()

  try {
    const result = await work(session.db)

    await session.commit()

    return result
  } catch (error) {
    await session.rollback()
    throw error
  }
}
