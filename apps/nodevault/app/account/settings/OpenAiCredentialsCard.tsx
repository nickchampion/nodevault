'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Alert, Button, Card, Description, FieldError, Input, Label, Spinner, TextField,
} from '@heroui/react'
import { setOpenAiKeyRequestSchema } from '@platform/components.nodevault.contracts'
import { formatLocalDate } from '@platform/components.utils'
import { Save, ShieldCheck, Sparkles } from 'lucide-react'
import type { SubmitEvent } from 'react'
import type { OpenAiCredentialsStatus, SetOpenAiKeyRequest } from '@platform/components.nodevault.contracts'
import { api } from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import { zodValidate } from '../../../lib/validation'
import type { FormErrors } from '../../../lib/validation'

const validateKeyForm = zodValidate(setOpenAiKeyRequestSchema)

/** badRequest responses carry a validation array alongside the generic envelope message. */
const serverValidation = (error: unknown): { path: string, message: string }[] => {
  const data = (error as { data?: { validation?: { path: string, message: string }[] } }).data

  return data?.validation ?? []
}

/**
 * Bring-your-own-OpenAI. Two modes depending on where the account already is:
 *  - switch: still on the Gemini trial, no GCP credentials connected — saving here is a
 *    one-way, irreversible move to OpenAI that re-embeds/re-mirrors any existing vault
 *    content.
 *  - rotate: already on OpenAI — saving here only replaces the stored key.
 * The key is verified with a live call when saved, encrypted at rest, and never
 * returned to the browser — the status endpoint only reports metadata.
 */
export const OpenAiCredentialsCard = () => {
  const { session, signIn } = useAuth()
  const mode = session?.account.aiProvider === 'openai' ? 'rotate' : 'switch'

  const [status, setStatus] = useState<OpenAiCredentialsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<SetOpenAiKeyRequest>({ apiKey: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const current = await api.account.openaiStatus.query()

        if (!cancelled) setStatus(current)
      } catch {
        // status is a nicety — the form still works without it
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()

    const validationErrors = validateKeyForm(state)

    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return

    setPending(true)
    setSaved(false)
    setError(null)

    try {
      const result = await api.account.setOpenAiKey.mutate({ ...state })

      setStatus(result)
      // the pasted key is write-only: clear it from the form the moment it's stored
      setState({ apiKey: '' })
      setSaved(true)

      if (session) {
        signIn({
          ...session,
          account: {
            ...session.account, aiProvider: 'openai', openaiConfigured: result.configured, openaiMigrating: result.migrating,
          },
        })
      }
    } catch (error_) {
      const validation = serverValidation(error_)

      if (validation.length > 0) {
        setErrors(Object.fromEntries(validation.map(issue => [issue.path, issue.message])))
        setError(validation[0].message)
      } else {
        setError((error_ as Error).message || 'Something went wrong. Please try again.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-500/10 shrink-0">
            <Sparkles className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div>
            <Card.Title>
              OpenAI credentials
            </Card.Title>

            <Card.Description>
              {mode === 'rotate'
                ? 'Embeddings, generation and managed search all run on your own OpenAI account'
                : 'Connect your own OpenAI account instead of Google Cloud'}
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
          : (
            <div className="space-y-4">
              {status?.configured && (
                <Alert status="success">
                  <Alert.Indicator />

                  <Alert.Content>
                    <Alert.Title>Connected to OpenAI</Alert.Title>

                    <Alert.Description>
                      Verified
                      {' '}
                      {status.verifiedAtUTC ? formatLocalDate(status.verifiedAtUTC, 'dd MMM yyyy HH:mm') : ''}
                      . Your key is stored encrypted and never shown again — paste a new key below to replace it.
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              {status?.migrating && (
                <Alert status="accent">
                  <Alert.Indicator />

                  <Alert.Content>
                    <Alert.Title>Migrating your vaults to OpenAI…</Alert.Title>

                    <Alert.Description>
                      Existing content is being re-embedded and re-indexed — this only takes a few minutes.
                      Vaults will be temporarily unavailable until it finishes.
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              {mode === 'switch' && (
                <>
                  <Alert status="warning">
                    <Alert.Indicator />

                    <Alert.Content>
                      <Alert.Title>This is a one-way switch</Alert.Title>

                      <Alert.Description>
                        Connecting OpenAI moves any vault content created during your Google Cloud trial
                        over to OpenAI and permanently switches this account to OpenAI. There is no
                        switching back, and Google Cloud credentials can no longer be connected afterwards.
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>

                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 text-sm text-slate-600 dark:text-slate-300 space-y-2">
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      You&apos;ll need, before saving:
                    </p>

                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        An OpenAI API key (starts with
                        {' '}
                        <span className="font-mono text-xs">sk-</span>
                        )
                      </li>
                      <li>A payment method on file with OpenAI — there&apos;s no free API tier</li>
                    </ul>

                    <p>
                      New to OpenAI?
                      {' '}
                      <Link
                        href="/help/openai"
                        className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                      >
                        Follow the step-by-step setup guide
                      </Link>
                      {' '}
                      — it covers creating a key and what happens to your trial content.
                    </p>
                  </div>
                </>
              )}

              <form
                className="space-y-4"
                noValidate
                onSubmit={submit}
              >
                <TextField
                  isRequired
                  isInvalid={Boolean(errors.apiKey)}
                  value={state.apiKey}
                  onChange={(apiKey) => {
                    setState({ apiKey })
                  }}
                >
                  <Label>OpenAI API key</Label>

                  <Input type="password" placeholder="sk-…" />

                  <Description>
                    Found in your OpenAI account under API keys
                  </Description>

                  <FieldError>{errors.apiKey}</FieldError>
                </TextField>

                <Button
                  type="submit"
                  isPending={pending}
                  fullWidth
                >
                  {pending ? <Spinner size="sm" /> : <Save className="size-4" />}
                  {pending
                    ? 'Verifying with OpenAI…'
                    : mode === 'switch' ? 'Connect OpenAI — moves existing content, can\'t be undone' : 'Verify & update key'}
                </Button>
              </form>

              <p className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                <ShieldCheck className="size-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />

                <span>
                  Your key is verified with a live OpenAI call, then encrypted (AES-256) before it is stored.
                  It is never logged and never sent back to your browser.
                </span>
              </p>

              {saved && (
                <Alert status="success">
                  <Alert.Indicator />

                  <Alert.Content>
                    <Alert.Title>Key verified and saved</Alert.Title>

                    <Alert.Description>
                      Your OpenAI account is connected.
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              {error && (
                <Alert status="danger">
                  <Alert.Indicator />

                  <Alert.Content>
                    <Alert.Title>Verification failed</Alert.Title>

                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
            </div>
          )}
      </Card.Content>
    </Card>
  )
}
