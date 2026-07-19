import { serverConfiguration } from '@platform/components.configuration.server'
import { createPool, PgSession } from '@platform/components.postgres'
import { schema } from '@platform/components.domain'
import type { DatabaseClient } from '@platform/components.context'

// one pool per process, shared by the request lifecycle and Inngest functions
export const pool = createPool(serverConfiguration.postgres)

/**
 * Unit of work for code running outside the tRPC request lifecycle (Inngest steps, the
 * ask SSE pipeline): no context.session, no middy transaction, so each piece of DB work
 * wraps itself in its own short-lived transactional session. Never hold a session across
 * an external call (Gemini, retries) — check out late, commit early.
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
