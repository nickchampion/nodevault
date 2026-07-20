'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Alert, Button, Card, FieldError, Input, Label, Spinner, Tabs, TextField,
} from '@heroui/react'
import { createVaultFromRssRequestSchema, createVaultRequestSchema, maxRssItems } from '@platform/components.nodevault.contracts'
import { formatLocalDate } from '@platform/components.utils'
import {
  FileText, Link2, MessagesSquare, Plus, Rss, Trash2, Vault,
} from 'lucide-react'
import type { SubmitEvent } from 'react'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@platform/apps.api'
import { LinkButton } from '../../components/ui/LinkButton'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { api } from '../../lib/api'
import { zodValidate } from '../../lib/validation'
import type { FormErrors } from '../../lib/validation'

type VaultDto = inferRouterOutputs<AppRouter>['vaults']['list']['vaults'][number]

const validateVaultForm = zodValidate(createVaultRequestSchema)
const validateRssForm = zodValidate(createVaultFromRssRequestSchema)

const count = (value: number, noun: string) => `${value} ${noun}${value === 1 ? '' : 's'}`

export const VaultsCard = () => {
  const [vaults, setVaults] = useState<VaultDto[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedUrl, setFeedUrl] = useState('')
  const [rssErrors, setRssErrors] = useState<FormErrors>({})
  const [rssPending, setRssPending] = useState(false)
  const [rssError, setRssError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<VaultDto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await api.vaults.list.query()

        if (!cancelled) setVaults(response.vaults)
      } catch (error_) {
        if (!cancelled) setError((error_ as Error).message || 'Failed to load your vaults')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationErrors = validateVaultForm({ name })

    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return

    setPending(true)
    setError(null)

    try {
      const vault = await api.vaults.create.mutate({ name })

      setVaults([...vaults, vault])
      setName('')
    } catch (error_) {
      setError((error_ as Error).message || 'Failed to create the vault. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const submitRss = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationErrors = validateRssForm({ feedUrl })

    setRssErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return

    setRssPending(true)
    setRssError(null)

    try {
      const vault = await api.vaults.createFromRss.mutate({ feedUrl })

      setVaults([...vaults, vault])
      setFeedUrl('')
    } catch (error_) {
      setRssError((error_ as Error).message || 'Failed to create the vault from that feed. Please try again.')
    } finally {
      setRssPending(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return

    setDeleting(true)
    setDeleteError(null)

    try {
      await api.vaults.delete.mutate({ vaultId: pendingDelete.id })
      setVaults(vaults.filter(vault => vault.id !== pendingDelete.id))
      setPendingDelete(null)
    } catch (error_) {
      setDeleteError((error_ as Error).message || 'Failed to delete the vault')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete vault?"
        description={`This will permanently delete "${pendingDelete?.name ?? 'this vault'}" and all of its documents and URLs. This cannot be undone.`}
        confirmLabel="Delete"
        isConfirming={deleting}
        onOpenChangeAction={isOpen => !isOpen && setPendingDelete(null)}
        onConfirmAction={() => void confirmDelete()}
      />

      <Card.Header>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-sky-500/10 shrink-0">
            <Vault className="size-5 text-sky-600 dark:text-sky-400" />
          </div>

          <div>
            <Card.Title>
              Vaults
            </Card.Title>

            <Card.Description>
              Group your documents and web pages into vaults
            </Card.Description>
          </div>
        </div>
      </Card.Header>

      <Card.Content>
        {loading
          ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          )
          : vaults.length === 0
            ? (
              <p className="text-slate-500 dark:text-slate-400 py-4 text-center">
                No vaults yet — create your first one below.
              </p>
            )
            : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {vaults.map(vault => (
                  <li
                    key={vault.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/account/vaults/${vault.id}`}
                          className="text-slate-900 dark:text-slate-100 font-medium hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                        >
                          {vault.name}
                        </Link>

                        {vault.rssFeedUrl && (
                          <Rss
                            className="size-3.5 text-orange-500 dark:text-orange-400 shrink-0"
                            aria-label="Synced from an RSS feed"
                          />
                        )}
                      </div>

                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Created
                        {' '}
                        {formatLocalDate(vault.createdAtUTC, 'dd MMM yyyy')}
                        {vault.rssFeedUrl && vault.rssLastPolledAtUTC && (
                          <>
                            {' · Last checked '}
                            {formatLocalDate(vault.rssLastPolledAtUTC, 'dd MMM yyyy')}
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 shrink-0">
                      <span className="flex items-center gap-1.5">
                        <FileText className="size-4" />
                        {count(vault.documentCount, 'document')}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Link2 className="size-4" />
                        {count(vault.urlCount, 'URL')}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <MessagesSquare className="size-4" />
                        {count(vault.conversationCount, 'conversation')}
                      </span>

                      <LinkButton
                        href={`/account/vaults/${vault.id}`}
                        size="sm"
                        className="hidden sm:inline-flex"
                      >
                        Open
                      </LinkButton>

                      <Button
                        variant="ghost"
                        isIconOnly
                        aria-label="Delete vault"
                        isDisabled={pendingDelete !== null}
                        onPress={() => setPendingDelete(vault)}
                      >
                        <Trash2 className="size-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

        {deleteError && (
          <Alert
            status="danger"
            className="mt-4"
          >
            <Alert.Indicator />

            <Alert.Content>
              <Alert.Title>Something went wrong</Alert.Title>

              <Alert.Description>{deleteError}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-800">
          <Tabs defaultSelectedKey="new">
            <Tabs.List aria-label="Create a vault">
              <Tabs.Tab id="new">
                New vault
                <Tabs.Indicator />
              </Tabs.Tab>

              <Tabs.Tab id="rss">
                From RSS feed
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel
              id="new"
              className="pt-4"
            >
              <form
                className="flex items-start gap-3"
                noValidate
                onSubmit={submit}
              >
                <TextField
                  isRequired
                  isInvalid={Boolean(errors.name)}
                  value={name}
                  onChange={setName}
                  className="flex-1"
                  aria-label="Vault name"
                >
                  <Label className="sr-only">Vault name</Label>

                  <Input placeholder="New vault name" />

                  <FieldError>{errors.name}</FieldError>
                </TextField>

                <Button
                  type="submit"
                  isPending={pending}
                >
                  {pending ? <Spinner size="sm" /> : <Plus className="size-4" />}
                  Create vault
                </Button>
              </form>

              {error && (
                <Alert
                  status="danger"
                  className="mt-4"
                >
                  <Alert.Indicator />

                  <Alert.Content>
                    <Alert.Title>Something went wrong</Alert.Title>

                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
            </Tabs.Panel>

            <Tabs.Panel
              id="rss"
              className="pt-4"
            >
              <form
                className="flex items-start gap-3"
                noValidate
                onSubmit={submitRss}
              >
                <TextField
                  isRequired
                  isInvalid={Boolean(rssErrors.feedUrl)}
                  value={feedUrl}
                  onChange={setFeedUrl}
                  className="flex-1"
                  aria-label="RSS feed URL"
                >
                  <Label className="sr-only">RSS feed URL</Label>

                  <Input placeholder="https://example.substack.com/feed" />

                  <FieldError>{rssErrors.feedUrl}</FieldError>
                </TextField>

                <Button
                  type="submit"
                  isPending={rssPending}
                >
                  {rssPending ? <Spinner size="sm" /> : <Rss className="size-4" />}
                  Create vault
                </Button>
              </form>

              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {`Imports the ${maxRssItems} most recent articles and checks for new ones weekly.`}
              </p>

              {rssError && (
                <Alert
                  status="danger"
                  className="mt-4"
                >
                  <Alert.Indicator />

                  <Alert.Content>
                    <Alert.Title>Something went wrong</Alert.Title>

                    <Alert.Description>{rssError}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
            </Tabs.Panel>
          </Tabs>
        </div>
      </Card.Content>
    </Card>
  )
}
