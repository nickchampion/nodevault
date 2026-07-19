import './client.js'

export * from './models/index.js'
export * from './types/errors.js'
export * from './types/search.js'

// the schema namespace is what gets handed to drizzle() and typeof'd for DatabaseClient
export * as schema from './models/index.js'
