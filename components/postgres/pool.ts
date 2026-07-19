import pg from 'pg'

export type PostgresOptions = {
  url: string
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
