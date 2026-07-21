'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Button, Input, Label, Spinner, TextField,
} from '@heroui/react'
import { Search } from 'lucide-react'
import type { SubmitEvent } from 'react'
import type { SearchType } from '@platform/components.nodevault.contracts'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@platform/apps.api'
import { api } from '../../lib/api'
import { AssetResultCard } from './AssetResultCard'

type SearchVaultResponse = inferRouterOutputs<AppRouter>['assets']['search']
type SearchResultDto = SearchVaultResponse['results'][number]

/**
 * Keyword / semantic search over a single vault. The search `type` is controlled by the
 * parent (the unified search page owns the mode selector); this panel owns the query
 * input, the `?q=` deep link, and the results list.
 */
export const SearchPanel = ({ vaultId, type }: { vaultId: number, type: SearchType }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParameters = useSearchParams()

  const [query, setQuery] = useState(() => searchParameters.get('q') ?? '')
  const [results, setResults] = useState<SearchResultDto[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runSearch = useCallback(async (searchQuery: string, searchType: SearchType) => {
    setSearching(true)
    setError(null)

    try {
      const response = await api.assets.search.query({ vaultId, query: searchQuery, type: searchType })

      setResults(response.results)
    } catch (error_) {
      setResults(null)
      setError((error_ as Error).message || 'Search failed')
    } finally {
      setSearching(false)
    }
  }, [vaultId])

  const initialQuery = searchParameters.get('q')
  const searchStarted = useRef(false)

  useEffect(() => {
    if (!initialQuery?.trim() || searchStarted.current) return

    searchStarted.current = true
    void runSearch(initialQuery.trim(), type)
  }, [initialQuery, runSearch, type])

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()

    const trimmed = query.trim()

    if (!trimmed || searching) return

    router.replace(`${pathname}?q=${encodeURIComponent(trimmed)}`, { scroll: false })

    await runSearch(trimmed, type)
  }

  return (
    <div>
      <form
        className="pb-4 mb-2"
        onSubmit={submit}
      >
        <div className="flex items-start gap-3">
          <TextField
            value={query}
            onChange={setQuery}
            className="flex-1"
            aria-label="Search the vault"
          >
            <Label className="sr-only">Search the vault</Label>

            <Input placeholder="Search your documents and URLs…" />
          </TextField>

          <Button
            type="submit"
            isDisabled={!query.trim() || searching}
            isPending={searching}
          >
            <Search className="size-4" />
            {searching ? 'Searching…' : 'Search'}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
            {error}
          </p>
        )}
      </form>

      {searching && (
        <div className="flex justify-center py-8">
          <Spinner size="sm" />
        </div>
      )}

      {!searching && results === null && !error && (
        <p className="text-slate-500 dark:text-slate-400 py-4 text-center">
          Enter a search term above to search this vault.
        </p>
      )}

      {!searching && results?.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400 py-4 text-center">
          No matches found — try a different search term.
        </p>
      )}

      {!searching && results && results.length > 0 && (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {results.map(result => (
            <li
              key={result.assetId}
              className="py-3"
            >
              <AssetResultCard
                variant="full"
                vaultId={vaultId}
                assetId={result.assetId}
                assetName={result.assetName}
                assetUrl={result.assetUrl}
                source={result.source}
                chunkIndex={result.chunkIndex}
                text={result.text}
                relevance={result.relevance}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
