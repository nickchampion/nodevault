import { AppError } from '@platform/components.domain'

/**
 * Type of `session.db` — the ORM database handle. Deliberately empty here so this
 * component stays ORM-agnostic; the application augments it with the concrete type:
 *
 * ```ts
 * declare module '@platform/components.context' {
 *   interface DatabaseClient extends NodePgDatabase<typeof schema> {}
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DatabaseClient {}

/**
 * Unit-of-work database session, one per request Context.
 *
 * The context middleware calls begin() before any mutating handler (POST/PUT/PATCH/
 * DELETE) runs, so every statement the handler executes joins one transaction; the same
 * middleware commits after the handler completes and rolls back when it throws (or when
 * the handler sets `veto`). Read-only handlers run their queries directly against the
 * pool — a GET handler that genuinely needs a transaction can call begin() itself.
 */
export interface Session {

  /** True once begin() has been called: statements will run inside a transaction. */
  readonly transactional: boolean

  /** Set to true from a handler to roll the transaction back instead of committing. */
  veto: boolean

  /**
   * ORM database handle. Statements issued through it run inside the session's
   * transaction when one is open, directly against the pool otherwise.
   */
  readonly db: DatabaseClient

  /** Mark the session transactional. Statements run in one transaction from here on. */
  begin(): void

  /** Commit the transaction (rolls back instead when vetoed). No-op outside one. */
  commit(): Promise<void>

  /** Roll the transaction back. No-op outside one. */
  rollback(): Promise<void>

  /** Run a statement and return all rows. */
  query<T>(text: string, parameters?: unknown[]): Promise<T[]>

  /** Run a statement and return the first row, or null. */
  queryOne<T>(text: string, parameters?: unknown[]): Promise<T | null>

  /** Run a statement and return the affected row count. */
  execute(text: string, parameters?: unknown[]): Promise<number>
}

export type SessionFactory = () => Session

/**
 * Default session used when no database has been configured. Data access throws so a
 * handler that expects persistence fails loudly; the transaction lifecycle methods are
 * no-ops so handlers that never touch data (e.g. ping) run fine.
 */
export class NullSession implements Session {
  public transactional = false
  public veto = false

  public get db(): DatabaseClient {
    throw this.notConfigured()
  }

  begin(): void {
    this.transactional = true
  }

  async commit(): Promise<void> {}

  async rollback(): Promise<void> {}

  query<T>(): Promise<T[]> {
    throw this.notConfigured()
  }

  queryOne<T>(): Promise<T | null> {
    throw this.notConfigured()
  }

  execute(): Promise<number> {
    throw this.notConfigured()
  }

  private notConfigured() {
    return new AppError('internal', 'No database session is configured for this API')
  }
}
