import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from './models/index.js'

// eslint-disable-next-line unicorn/require-module-specifiers -- empty type import loads the context module into this program so the augmentation below can attach to it (erased at emit: no runtime dependency)
import type {} from '@platform/components.context'

/**
 * Give `context.session.db` the concrete Drizzle type for the workspace schema. The
 * Session interface declares `db: DatabaseClient` (empty, ORM-agnostic); this
 * augmentation is what makes `session.db.query.users...` fully typed in any project
 * that imports @platform/components.domain — no per-app redefinition needed.
 */
declare module '@platform/components.context' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface DatabaseClient extends NodePgDatabase<typeof schema> {}
}
