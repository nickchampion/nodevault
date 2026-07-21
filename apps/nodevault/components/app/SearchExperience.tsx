'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Card, ListBox, Select, Spinner, ToggleButton, ToggleButtonGroup, Tooltip,
} from '@heroui/react'
import type { AskMode, SearchType } from '@platform/components.nodevault.contracts'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@platform/apps.api'
import { api } from '../../lib/api'
import { LinkButton } from '../ui/LinkButton'
import { SearchPanel } from './SearchPanel'
import { ConversationChat } from './ConversationChat'

type VaultDto = inferRouterOutputs<AppRouter>['vaults']['list']['vaults'][number]

// the four modes the search page exposes, unified into one selector — the first two run
// a one-shot search (api.assets.search), the last two stream a grounded answer (streamAsk)
type SearchMode = SearchType | AskMode

const modes: { id: SearchMode, kind: 'search' | 'ask', label: string, description: string }[] = [
  {
    id: 'combined',
    kind: 'search',
    label: 'Semantic',
    description: 'Blends keyword and semantic matching for the best all-round results. Recommended for most searches.',
  },
  {
    id: 'keyword',
    kind: 'search',
    label: 'Keyword',
    description: 'Matches exact words, names, codes, and acronyms using full-text search.',
  },
  {
    id: 'local',
    kind: 'ask',
    label: 'Q&A · Your provider',
    description: "We find the most relevant passages in your vault with our own hybrid pgvector search, then hand them to your connected provider's model (Gemini or OpenAI) to write the answer.",
  },
  {
    id: 'managed',
    kind: 'ask',
    label: 'Q&A · Provider search',
    description: "Your connected provider's own managed search (Vertex AI Search for Google Cloud, file search for OpenAI) grounds its answer as it responds. Newly added content can take a few minutes to appear.",
  },
]

// a conversation to preload into one of the Q&A tabs on mount (from ?conversationId)
type InitialAsk = { conversationId: number, mode: AskMode, vaultId: number }

/**
 * The account home search entry point: pick a vault, pick a mode, then search or ask.
 * Search modes render the results list (SearchPanel); Q&A modes render the streaming
 * conversation feed. The two Q&A panels stay mounted (hidden when inactive) so each mode
 * keeps its own conversation across toggles — switching engines starts a fresh
 * conversation only where none exists yet. `?conversationId=` preloads a conversation on
 * its originating mode's tab.
 */
export const SearchExperience = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [vaults, setVaults] = useState<VaultDto[] | null>(null)
  const [selectedVaultId, setSelectedVaultId] = useState<number | null>(null)
  const [mode, setMode] = useState<SearchMode>('combined')
  const [initialAsk, setInitialAsk] = useState<InitialAsk | null>(null)
  const [resolving, setResolving] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { vaults: loaded } = await api.vaults.list.query()

        if (cancelled) return

        setVaults(loaded)

        // deep link: open a specific conversation on the tab of the mode it was created in
        const conversationIdParam = searchParams.get('conversationId')

        if (conversationIdParam) {
          try {
            const { conversation } = await api.conversations.get.query({
              conversationId: Number(conversationIdParam),
            })

            if (cancelled) return

            setSelectedVaultId(conversation.vaultId)
            setMode(conversation.mode)
            setInitialAsk({
              conversationId: conversation.id,
              mode: conversation.mode,
              vaultId: conversation.vaultId,
            })
            setResolving(false)

            return
          } catch {
            // conversation gone or not accessible — fall back to the default vault
          }
        }

        setSelectedVaultId(current => current ?? loaded[0]?.id ?? null)
        setResolving(false)
      } catch (error_) {
        if (!cancelled) {
          setError((error_ as Error).message || 'Failed to load your vaults')
          setResolving(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
    // resolved once on mount from the initial query string
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400 py-4 text-center">
        {error}
      </p>
    )
  }

  if (resolving || vaults === null) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="sm" />
      </div>
    )
  }

  if (vaults.length === 0) {
    return (
      <Card>
        <Card.Content>
          <div className="flex flex-col items-center text-center gap-4 py-10">
            <div className="space-y-1 max-w-xl">
              <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                No vaults yet
              </p>

              <p className="text-slate-500 dark:text-slate-400">
                Create a vault and add documents or web pages, then come back here to
                search and ask questions across them.
              </p>
            </div>

            <LinkButton href="/account/vaults">
              Create a vault
            </LinkButton>
          </div>
        </Card.Content>
      </Card>
    )
  }

  const activeMode = modes.find(candidate => candidate.id === mode) ?? modes[0]

  // only inject the preloaded conversation into its own mode's panel, and only while the
  // originating vault is still selected (switching vault clears it)
  const askInitial = (askMode: AskMode) => (
    initialAsk && initialAsk.mode === askMode && initialAsk.vaultId === selectedVaultId
      ? initialAsk.conversationId
      : undefined
  )

  // resetting to a fresh conversation drops the deep link so a refresh won't reload the old one
  const clearConversationDeepLink = () => {
    setInitialAsk(null)

    if (!searchParams.get('conversationId')) return

    const params = new URLSearchParams(searchParams.toString())

    params.delete('conversationId')

    const query = params.toString()

    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <Card>
      <Card.Content>
        <div className="flex flex-col gap-3 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <Select
            aria-label="Vault to search"
            className="lg:w-64 shrink-0"
            value={selectedVaultId === null ? undefined : String(selectedVaultId)}
            onChange={(key) => {
              setSelectedVaultId(Number(key))
              // the preloaded conversation belongs to the previous vault
              setInitialAsk(null)
            }}
          >
            <Select.Trigger>
              <Select.Value />

              <Select.Indicator />
            </Select.Trigger>

            <Select.Popover>
              <ListBox>
                {vaults.map(vault => (
                  <ListBox.Item
                    key={vault.id}
                    id={String(vault.id)}
                    textValue={vault.name}
                  >
                    {vault.name}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <ToggleButtonGroup
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={new Set([mode])}
            onSelectionChange={(keys) => {
              const [key] = [...keys]

              if (key) setMode(key as SearchMode)
            }}
            aria-label="Search mode"
            className="flex-wrap"
          >
            {modes.map(candidate => (
              <Tooltip.Root
                key={candidate.id}
                delay={200}
              >
                <Tooltip.Trigger>
                  <ToggleButton
                    id={candidate.id}
                    className="mr-2"
                  >
                    {candidate.label}
                  </ToggleButton>
                </Tooltip.Trigger>

                <Tooltip.Content className="break-normal">
                  {candidate.description}
                </Tooltip.Content>
              </Tooltip.Root>
            ))}
          </ToggleButtonGroup>
        </div>

        {selectedVaultId !== null && (
          <>
            {activeMode.kind === 'search' && (
              <SearchPanel
                key={`search-${selectedVaultId}-${mode}`}
                vaultId={selectedVaultId}
                type={mode as SearchType}
              />
            )}

            {/* both Q&A panels stay mounted so each engine keeps its own conversation
                across toggles; remounted only when the vault changes */}
            <div className={activeMode.id === 'local' ? '' : 'hidden'}>
              <ConversationChat
                key={`local-${selectedVaultId}`}
                vaultId={selectedVaultId}
                mode="local"
                initialConversationId={askInitial('local')}
                onNewConversationAction={clearConversationDeepLink}
              />
            </div>

            <div className={activeMode.id === 'managed' ? '' : 'hidden'}>
              <ConversationChat
                key={`managed-${selectedVaultId}`}
                vaultId={selectedVaultId}
                mode="managed"
                initialConversationId={askInitial('managed')}
                onNewConversationAction={clearConversationDeepLink}
              />
            </div>
          </>
        )}
      </Card.Content>
    </Card>
  )
}
