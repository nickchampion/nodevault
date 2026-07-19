import type pg from 'pg'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { DatabaseClient, Session, SessionEvents, SessionEvent } from '@platform/components.context'
import { AppError, schema } from '@platform/components.nodevault.domain'

/**
 * Postgres-backed unit-of-work session, one per request Context.
 *
 * The context middleware calls begin() before a mutating handler runs and commit() /
 * rollback() after it, so all of a handler's statements execute in a single
 * transaction. begin() only marks the session transactional — the connection is checked
 * out and BEGIN issued lazily on the first statement, so handlers that never touch the
 * database don't occupy a pooled connection. Reads outside a transaction run directly
 * against the pool.
 *
 * Statements reach Postgres two ways, both routed through the same lazy
 * transaction-aware path:
 * - `session.db` — the Drizzle instance (typed via the app's DatabaseClient augmentation)
 * - `session.query/queryOne/execute` — raw SQL escape hatch
 */
export class PgSession implements Session {
  public transactional = false
  public veto = false

  private pool: pg.Pool
  private client?: pg.PoolClient
  private begun = false
  private drizzleDb: NodePgDatabase<Record<string, unknown>>
  private eventListeners: Record<string, SessionEvent[]> = {}

  constructor(pool: pg.Pool, schema?: Record<string, unknown>) {
    this.pool = pool

    // Drizzle only ever calls query() on the driver we hand it; giving it a facade
    // backed by target() makes every Drizzle statement join the session's transaction
    const facade = { query: (...arguments_: unknown[]) => this.run(...arguments_) }

    this.drizzleDb = drizzle(facade as unknown as pg.Pool, { schema })
  }

  on<T extends keyof SessionEvents>(event: T, listener: SessionEvents[T]): void | Promise<void> {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = []
    }

    this.eventListeners[event].push(listener)
  }

  public get db(): DatabaseClient {
    return this.drizzleDb as DatabaseClient
  }

  public begin(): void {
    this.transactional = true
  }

  public async query<T>(text: string, parameters?: unknown[]): Promise<T[]> {
    const result = (await this.run(text, parameters)) as pg.QueryResult

    return result.rows as T[]
  }

  public async queryOne<T>(text: string, parameters?: unknown[]): Promise<T | null> {
    const result = (await this.run(text, parameters)) as pg.QueryResult

    return (result.rows[0] as T) ?? null
  }

  public async execute(text: string, parameters?: unknown[]): Promise<number> {
    const result = (await this.run(text, parameters)) as pg.QueryResult

    return result.rowCount ?? 0
  }

  public async commit(): Promise<void> {
    if (!this.begun) return

    if (this.veto) {
      await this.rollback()
      return
    }

    try {
      this.emit('beforeCommit')
      await this.client!.query('COMMIT')
      this.emit('afterCommit')
    } finally {
      this.release()
    }
  }

  public async rollback(): Promise<void> {
    if (!this.begun) return

    try {
      await this.client!.query('ROLLBACK')
    } catch {
      // the connection may already be dead; releasing it below is all that matters
    } finally {
      this.release()
    }
  }

  /**
   * Raise an event and invoke event listeners asyncronously
   * @param event
   * @param arg
   * @returns
   */
  private async emit<T extends keyof SessionEvents>(event: T): Promise<void> {
    const events = this.eventListeners[event]

    if (!events) return

    for (const evt of events) {
      await evt(new PgSession(this.pool, schema))
    }
  }

  /**
   * Route a statement to the transaction client (checked out and BEGUN lazily) when the
   * session is transactional, or to the pool otherwise. Accepts whatever argument shape
   * the caller (raw helpers or Drizzle) uses and forwards it verbatim.
   */
  private async run(...arguments_: unknown[]): Promise<unknown> {
    try {
      const target = this.transactional ? await this.transaction() : this.pool

      return await (target.query as (...arguments__: unknown[]) => Promise<unknown>)(...arguments_)
    } catch (error) {
      throw this.mapError(error)
    }
  }

  private async transaction(): Promise<pg.PoolClient> {
    if (!this.client) {
      this.client = await this.pool.connect()

      try {
        await this.client.query('BEGIN')
        this.begun = true
      } catch (error) {
        this.release()
        throw error
      }
    }

    return this.client
  }

  private release(): void {
    this.client?.release()
    this.client = undefined
    this.begun = false
    this.transactional = false
  }

  // 23505 = unique violation: surface as a data conflict (409) with a readable message
  // derived from the constraint name, e.g. users_email_unique -> "users email"
  private mapError(error: unknown): Error {
    const pgError = error as { code?: string, constraint?: string }

    if (pgError.code === '23505') {
      const subject = pgError.constraint?.replaceAll(/_unique$|_key$/g, '').replaceAll('_', ' ') ?? 'value'

      return new AppError('conflict', `A record with this ${subject} already exists`)
    }

    return error as Error
  }
}
