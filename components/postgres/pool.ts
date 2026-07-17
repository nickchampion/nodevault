import pg from 'pg'

export type PostgresOptions = {

  /** Connection string, e.g. postgres://user:pass@host:5432/db */
  url: string

  /** Maximum pool size per process */
  poolSize?: number
}

/**
 * Create the process-wide connection pool. Create one pool at startup and share it —
 * sessions borrow connections from it only for the duration of a commit.
 */
export const createPool = (options: PostgresOptions): pg.Pool => new pg.Pool({
  connectionString: options.url,
  max: options.poolSize ?? 10,
})
