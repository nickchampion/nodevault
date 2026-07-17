import { toUtcIso } from '@platform/components.utils'
import type { FileDto } from '@platform/components.contracts'
import type { VaultFile } from '@platform/components.domain'

export const toFileDto = (file: VaultFile): FileDto => ({
  id: file.id,
  source: file.source,
  name: file.name,
  url: file.url,
  contentType: file.contentType,
  sizeBytes: file.sizeBytes,
  status: file.status,
  error: file.error,
  createdAtUTC: toUtcIso(file.createdAtUTC),
})
