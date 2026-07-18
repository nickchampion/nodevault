'use client'

import { useState } from 'react'
import {
  Button, Input, Label, Spinner, TextField, ToggleButton, ToggleButtonGroup,
} from '@heroui/react'
import { FileText, Link2, Search } from 'lucide-react'
import type { FormEvent } from 'react'
import type { SearchType } from '@platform/components.contracts'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@platform/apps.api'
import { api } from '../../../../lib/api'

type SearchVaultResponse = inferRouterOutputs<AppRouter>['assets']['search']
type SearchResultDto = SearchVaultResponse['results'][number]

const searchModes: { id: SearchType, label: string }[] = [
  { id: 'retrieval', label: 'Document retrieval' },
  { id: 'qa', label: 'Q & A' },
]

export const SearchPanel = ({ vaultId }: { vaultId: number }) => {
  const [type, setType] = useState<SearchType>('retrieval')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultDto[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    if (!query.trim() || searching) return

    setSearching(true)
    setError(null)

    try {
      const response = await api.assets.search.query({ vaultId, query: query.trim(), type })

      setResults(response.results)
    } catch (error_) {
      setResults(null)
      setError((error_ as Error).message || 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div>
      <form
        className="pb-4 mb-2 border-b border-slate-200 dark:border-slate-800"
        onSubmit={submit}
      >
        <ToggleButtonGroup
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={new Set([type])}
          onSelectionChange={(keys) => {
            const [key] = [...keys]

            if (key) setType(key as SearchType)
          }}
          aria-label="Search mode"
          className="mb-3"
        >
          {searchModes.map(mode => (
            <ToggleButton key={mode.id} id={mode.id}>
              {mode.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

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
              key={`${result.assetId}-${result.chunkIndex}`}
              className="py-3"
            >
              <div className="flex items-center gap-2 mb-1">
                {result.source === 'file'
                  ? <FileText className="size-4 text-slate-500 dark:text-slate-400 shrink-0" />
                  : <Link2 className="size-4 text-slate-500 dark:text-slate-400 shrink-0" />}

                <p className="text-slate-900 dark:text-slate-100 font-medium truncate">
                  {result.assetName ?? result.assetUrl ?? 'Untitled'}
                </p>

                <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 ml-auto">
                  {Math.round(result.similarity * 100)}
                  % match
                </span>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                {result.text}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
