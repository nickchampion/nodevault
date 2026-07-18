import type { DatabaseClient } from '@platform/components.context'
import type { SearchResultDto } from '@platform/components.contracts'

export type SearchStrategy = (db: DatabaseClient, vaultId: number, query: string) => Promise<SearchResultDto[]>
