import type { SearchType } from '@platform/components.nodevault.contracts'
import type { DatabaseClient } from '@platform/components.context'
import type { SearchResultDto } from '@platform/components.nodevault.contracts'
import type { AiClient } from '../../../ai.js'
import { combinedSearch } from './combined.js'
import { keywordSearch } from './keyword.js'

export type SearchStrategy = (db: DatabaseClient, ai: AiClient, vaultId: number, query: string) => Promise<SearchResultDto[]>

const strategies: Record<SearchType, SearchStrategy> = {
  combined: combinedSearch,
  keyword: keywordSearch,
}

export const resolveSearchStrategy = (type: SearchType): SearchStrategy => strategies[type]
