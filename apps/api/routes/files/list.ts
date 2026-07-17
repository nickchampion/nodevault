import { and, count, desc, eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { ListFilesRequest, ListFilesResponse } from '@platform/components.contracts'
import { files, vaults } from '@platform/components.domain'
import { toFileDto } from './mappers.js'

export const filesList: ApiHandler<ListFilesRequest, ListFilesResponse> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const {
    vaultId, source, page, pageSize,
  } = context.event.payload

  const vault = await context.session.db.query.vaults.findFirst({
    columns: { id: true },
    where: and(eq(vaults.id, vaultId), eq(vaults.accountId, accountId)),
  })

  if (!vault) return context.event.response.notFound()

  const filter = and(eq(files.vaultId, vaultId), eq(files.source, source))

  const [{ total }] = await context.session.db
    .select({ total: count() })
    .from(files)
    .where(filter)

  const rows = await context.session.db
    .select()
    .from(files)
    .where(filter)
    .orderBy(desc(files.createdAtUTC), desc(files.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  return context.event.response.ok({
    files: rows.map(toFileDto),
    total,
    page,
    pageSize,
  })
}
