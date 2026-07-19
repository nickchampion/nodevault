'use client'

import { useEffect, useState } from 'react'
import {
  Alert, Button, Card, FieldError, Input, Label, Spinner, TextField,
} from '@heroui/react'
import { createTopicRequestSchema } from '@platform/components.nodevault.contracts'
import { formatLocalDate } from '@platform/components.utils'
import { Bell, Plus, Trash2 } from 'lucide-react'
import type { SubmitEvent } from 'react'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@platform/apps.api'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { api } from '../../../lib/api'
import { zodValidate } from '../../../lib/validation'
import type { FormErrors } from '../../../lib/validation'

type TopicDto = inferRouterOutputs<AppRouter>['topics']['list']['topics'][number]

const validateTopicForm = zodValidate(createTopicRequestSchema)

const statusStyles: Record<TopicDto['status'], string> = {
  pending: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  ready: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  failed: 'bg-red-500/10 text-red-700 dark:text-red-400',
}

export const AlertsCard = () => {
  const [topics, setTopics] = useState<TopicDto[]>([])
  const [loading, setLoading] = useState(true)
  const [topic, setTopic] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<TopicDto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const load = async (silent = false) => {
      if (!silent) setLoading(true)

      try {
        const response = await api.topics.list.query()

        if (cancelled) return

        setTopics(response.topics)
        setError(null)

        // keep polling quietly while the embed-topic workflow still has one in flight
        if (response.topics.some(item => item.status === 'pending')) {
          timer = setTimeout(() => void load(true), 2500)
        }
      } catch (error_) {
        if (!cancelled) setError((error_ as Error).message || 'Failed to load your alerts')
      } finally {
        if (!cancelled && !silent) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true

      if (timer) clearTimeout(timer)
    }
  }, [])

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationErrors = validateTopicForm({ topic })

    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return

    setPending(true)
    setError(null)

    try {
      const created = await api.topics.create.mutate({ topic })

      setTopics([created, ...topics])
      setTopic('')
    } catch (error_) {
      setError((error_ as Error).message || 'Failed to save the alert. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return

    setDeleting(true)
    setDeleteError(null)

    try {
      await api.topics.delete.mutate({ topicId: pendingDelete.id })
      setTopics(topics.filter(item => item.id !== pendingDelete.id))
      setPendingDelete(null)
    } catch (error_) {
      setDeleteError((error_ as Error).message || 'Failed to delete the alert')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete alert?"
        description={`This will stop notifying you when new content matches "${pendingDelete?.topic ?? 'this topic'}".`}
        confirmLabel="Delete"
        isConfirming={deleting}
        onOpenChangeAction={isOpen => !isOpen && setPendingDelete(null)}
        onConfirmAction={() => void confirmDelete()}
      />

      <Card.Header>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-sky-500/10 shrink-0">
            <Bell className="size-5 text-sky-600 dark:text-sky-400" />
          </div>

          <div>
            <Card.Title>
              Follow topics that matter
            </Card.Title>

            <Card.Description>
              Save a topic and we&apos;ll email you when something you add touches on it
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
          : topics.length === 0
            ? (
              <p className="text-slate-500 dark:text-slate-400 py-4 text-center">
                No alerts yet — follow your first topic below.
              </p>
            )
            : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {topics.map(item => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Bell className="size-4 text-slate-500 dark:text-slate-400 shrink-0" />

                      <div className="min-w-0">
                        <p className="text-slate-900 dark:text-slate-100 font-medium truncate">
                          {item.topic}
                        </p>

                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                          Added
                          {' '}
                          {formatLocalDate(item.createdAtUTC, 'dd MMM yyyy')}
                        </p>

                        {item.status === 'failed' && item.error && (
                          <p className="text-sm text-red-600 dark:text-red-400 truncate">
                            {item.error}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyles[item.status]}`}>
                        {item.status}
                      </span>

                      <Button
                        variant="ghost"
                        isIconOnly
                        aria-label="Delete alert"
                        isDisabled={pendingDelete !== null}
                        onPress={() => setPendingDelete(item)}
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
            isInvalid={Boolean(errors.topic)}
            value={topic}
            onChange={setTopic}
            className="flex-1"
            aria-label="Topic"
          >
            <Label className="sr-only">Topic</Label>

            <Input placeholder="e.g. Q3 pricing changes" />

            <FieldError>{errors.topic}</FieldError>
          </TextField>

          <Button
            type="submit"
            isPending={pending}
          >
            {pending ? <Spinner size="sm" /> : <Plus className="size-4" />}
            Follow topic
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
