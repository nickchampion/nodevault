'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Alert, Button, Card, FieldError, Input, Label, Spinner, TextField,
} from '@heroui/react'
import { createVaultRequestSchema } from '@platform/components.contracts'
import { formatLocalDate } from '@platform/components.utils'
import {
  FileText, Link2, Plus, Trash2, Vault,
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

const count = (value: number, noun: string) => `${value} ${noun}${value === 1 ? '' : 's'}`

export const VaultsCard = () => {
  const [vaults, setVaults] = useState<VaultDto[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
                      <Link
                        href={`/account/vaults/${vault.id}`}
                        className="text-slate-900 dark:text-slate-100 font-medium hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                      >
                        {vault.name}
                      </Link>

                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Created
                        {' '}
                        {formatLocalDate(vault.createdAtUTC, 'dd MMM yyyy')}
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

        <form
          className="flex items-start gap-3 pt-4 mt-2 border-t border-slate-200 dark:border-slate-800"
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
      </Card.Content>
    </Card>
  )
}
