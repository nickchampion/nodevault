'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Alert, Button, Card, Input, Label, ListBox, Select, Spinner, TextField,
} from '@heroui/react'
import { formatLocalDate } from '@platform/components.utils'
import {
  MessagesSquare, Search, Trash2, Vault,
} from 'lucide-react'
import type { ConversationDto, ListConversationsResponse, VaultDto } from '@platform/components.nodevault.contracts'
import { getSession, isSessionValid, useAuth } from '../../../lib/auth'
import { api } from '../../../lib/api'
import { PageHero } from '../../../components/app/PageHero'
import { Container } from '../../../components/ui/Container'
import { LinkButton } from '../../../components/ui/LinkButton'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Pagination } from '../../../components/ui/Pagination'

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

export const ConversationsView = () => {
  const router = useRouter()
  const { session } = useAuth()

  const [vaults, setVaults] = useState<VaultDto[]>([])
  const [vaultFilter, setVaultFilter] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  const [data, setData] = useState<ListConversationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)

  const [pendingDelete, setPendingDelete] = useState<ConversationDto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // authenticated-only page
  useEffect(() => {
    if (!isSessionValid(getSession())) {
      router.replace('/auth/login')
    }
  }, [router])

  // vaults for the filter dropdown
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await api.vaults.list.query()

        if (!cancelled) setVaults(response.vaults)
      } catch {
        // the filter falls back to "All vaults" — the conversation list still works
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)

      try {
        const response = await api.conversations.list.query({
          vaultId: vaultFilter ?? undefined,
          search: debouncedSearch || undefined,
          page,
          pageSize: PAGE_SIZE,
        })

        if (cancelled) return

        setData(response)
        setError(null)
      } catch (error_) {
        if (!cancelled) setError((error_ as Error).message || 'Failed to load your conversations')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [vaultFilter, debouncedSearch, page, reloadVersion])

  const confirmDelete = async () => {
    if (!pendingDelete) return

    setDeleting(true)
    setDeleteError(null)

    try {
      await api.conversations.delete.mutate({ conversationId: pendingDelete.id })
      setPendingDelete(null)

      // deleting the only row on a later page steps back rather than showing an empty page
      if (data && data.conversations.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        setReloadVersion(version => version + 1)
      }
    } catch (error_) {
      setDeleteError((error_ as Error).message || 'Failed to delete the conversation')
    } finally {
      setDeleting(false)
    }
  }

  if (!session) return null

  const filtered = vaultFilter !== null || debouncedSearch.length > 0

  return (
    <div>
      <PageHero
        eyebrow="Account"
        title="Conversations"
        description="Pick up where you left off — every vault conversation, most recent first."
      />

      <Container className="py-12">
        <Card>
          <ConfirmDialog
            isOpen={pendingDelete !== null}
            title="Delete conversation?"
            description={`This will permanently delete "${pendingDelete?.title ?? 'this conversation'}" and all of its messages. This cannot be undone.`}
            confirmLabel="Delete"
            isConfirming={deleting}
            onOpenChangeAction={isOpen => !isOpen && setPendingDelete(null)}
            onConfirmAction={() => void confirmDelete()}
          />

          <Card.Header>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-sky-500/10 shrink-0">
                <MessagesSquare className="size-5 text-sky-600 dark:text-sky-400" />
              </div>

              <div>
                <Card.Title>
                  Past conversations
                </Card.Title>

                <Card.Description>
                  Open a conversation to review the answers or keep asking
                </Card.Description>
              </div>
            </div>
          </Card.Header>

          <Card.Content>
            <div className="flex flex-col sm:flex-row gap-3 pb-4 mb-2 border-b border-slate-200 dark:border-slate-800">
              <Select
                aria-label="Filter by vault"
                className="sm:w-56 shrink-0"
                value={vaultFilter === null ? 'all' : String(vaultFilter)}
                onChange={(key) => {
                  setVaultFilter(key === 'all' ? null : Number(key))
                  setPage(1)
                }}
              >
                <Select.Trigger>
                  <Select.Value />

                  <Select.Indicator />
                </Select.Trigger>

                <Select.Popover>
                  <ListBox>
                    <ListBox.Item
                      id="all"
                      textValue="All vaults"
                    >
                      All vaults
                    </ListBox.Item>

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

              <TextField
                value={search}
                onChange={setSearch}
                className="flex-1"
                aria-label="Search conversations"
              >
                <Label className="sr-only">Search conversations</Label>

                <div className="relative">
                  <Search className="size-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

                  <Input
                    placeholder="Search by title…"
                    className="pl-9"
                  />
                </div>
              </TextField>
            </div>

            {loading
              ? (
                <div className="flex justify-center py-8">
                  <Spinner size="sm" />
                </div>
              )
              : !data || data.total === 0
                ? (
                  <p className="text-slate-500 dark:text-slate-400 py-4 text-center">
                    {filtered
                      ? 'No conversations match your filters.'
                      : 'No conversations yet — open a vault and ask your first question.'}
                  </p>
                )
                : (
                  <>
                    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                      {data.conversations.map(conversation => (
                        <li
                          key={conversation.id}
                          className="flex items-center justify-between gap-4 py-3"
                        >
                          <div className="min-w-0">
                            <Link
                              href={`/account?conversationId=${conversation.id}`}
                              className="block text-slate-900 dark:text-slate-100 font-medium hover:text-sky-600 dark:hover:text-sky-400 transition-colors truncate"
                            >
                              {conversation.title}
                            </Link>

                            <p className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                              <Vault className="size-3.5 shrink-0" />

                              <span className="truncate">
                                {conversation.vaultName}
                              </span>

                              <span aria-hidden>·</span>

                              {formatLocalDate(conversation.updatedAtUTC, 'dd MMM yyyy, HH:mm')}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <LinkButton
                              href={`/account?conversationId=${conversation.id}`}
                              size="sm"
                              className="hidden sm:inline-flex"
                            >
                              Continue
                            </LinkButton>

                            <Button
                              variant="ghost"
                              isIconOnly
                              aria-label="Delete conversation"
                              isDisabled={pendingDelete !== null}
                              onPress={() => setPendingDelete(conversation)}
                            >
                              <Trash2 className="size-4 text-red-600 dark:text-red-400" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {data.total > data.pageSize && (
                      <div className="flex justify-center pt-4 mt-2 border-t border-slate-200 dark:border-slate-800">
                        <Pagination
                          page={data.page}
                          pageSize={data.pageSize}
                          total={data.total}
                          onChangeAction={setPage}
                        />
                      </div>
                    )}
                  </>
                )}

            {(error ?? deleteError) && (
              <Alert
                status="danger"
                className="mt-4"
              >
                <Alert.Indicator />

                <Alert.Content>
                  <Alert.Title>Something went wrong</Alert.Title>

                  <Alert.Description>{error ?? deleteError}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}
          </Card.Content>
        </Card>
      </Container>
    </div>
  )
}
