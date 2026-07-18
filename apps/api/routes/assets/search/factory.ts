import type { SearchType } from '@platform/components.contracts'
import { agenticSearch } from './agentic.js'
import { combinedSearch } from './combined.js'
import { keywordSearch } from './keyword.js'
import { semanticSearch } from './semantic.js'
import type { SearchStrategy } from './types.js'

const strategies: Record<SearchType, SearchStrategy> = {
  combined: combinedSearch,
  keyword: keywordSearch,
  semantic: semanticSearch,
  agentic: agenticSearch,
}

export const getSearchStrategy = (type: SearchType): SearchStrategy => strategies[type]
