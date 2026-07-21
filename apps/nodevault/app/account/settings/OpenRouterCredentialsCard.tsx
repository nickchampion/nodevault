'use client'

import { useEffect, useState } from 'react'
import {
  Alert, Button, Card, Description, FieldError, Input, Label, Spinner, TextField,
} from '@heroui/react'
import { setOpenRouterKeyRequestSchema } from '@platform/components.nodevault.contracts'
import { formatLocalDate } from '@platform/components.utils'
import { Router, Save, ShieldCheck } from 'lucide-react'
import type { SubmitEvent } from 'react'
import type { OpenRouterCredentialsStatus, SetOpenRouterKeyRequest } from '@platform/components.nodevault.contracts'
import { api } from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import { zodValidate } from '../../../lib/validation'
import type { FormErrors } from '../../../lib/validation'

const validateKeyForm = zodValidate(setOpenRouterKeyRequestSchema)

/** badRequest responses carry a validation array alongside the generic envelope message. */
const serverValidation = (error: unknown): { path: string, message: string }[] => {
  const data = (error as { data?: { validation?: { path: string, message: string }[] } }).data

  return data?.validation ?? []
}

/**
 * Bring-your-own-OpenRouter — an *additive* generation override, not a provider switch. It
 * layers on top of the account's connected base provider (which still does embeddings and
 * retrieval) and unlocks the "Q&A · OpenRouter" mode, where any OpenRouter model can answer.
 * The key is verified with a live call, encrypted at rest, and never returned to the browser.
 */
export const OpenRouterCredentialsCard = () => {
  const { session, signIn } = useAuth()

  const [status, setStatus] = useState<OpenRouterCredentialsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<SetOpenRouterKeyRequest>({ apiKey: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const current = await api.account.openrouterStatus.query()

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
      const result = await api.account.setOpenrouterKey.mutate({ ...state })

      setStatus(result)
      // the pasted key is write-only: clear it from the form the moment it's stored
      setState({ apiKey: '' })
      setSaved(true)

      if (session) {
        signIn({
          ...session,
          account: { ...session.account, openrouterConfigured: result.configured },
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
          <div className="flex items-center justify-center size-10 rounded-lg bg-indigo-500/10 shrink-0">
            <Router className="size-5 text-indigo-600 dark:text-indigo-400" />
          </div>

          <div>
            <Card.Title>
              OpenRouter (optional)
            </Card.Title>

            <Card.Description>
              Answer questions with any model on OpenRouter — your base provider still handles search
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
                    <Alert.Title>OpenRouter connected</Alert.Title>

                    <Alert.Description>
                      Verified
                      {' '}
                      {status.verifiedAtUTC ? formatLocalDate(status.verifiedAtUTC, 'dd MMM yyyy HH:mm') : ''}
                      . The &ldquo;Q&amp;A · OpenRouter&rdquo; search mode is unlocked. Your key is stored
                      encrypted and never shown again — paste a new key below to replace it.
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
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
                  <Label>OpenRouter API key</Label>

                  <Input type="password" placeholder="sk-or-…" />

                  <Description>
                    Found in your OpenRouter dashboard under Keys
                  </Description>

                  <FieldError>{errors.apiKey}</FieldError>
                </TextField>

                <Button
                  type="submit"
                  isPending={pending}
                  fullWidth
                >
                  {pending ? <Spinner size="sm" /> : <Save className="size-4" />}
                  {pending ? 'Verifying with OpenRouter…' : status?.configured ? 'Verify & update key' : 'Connect OpenRouter'}
                </Button>
              </form>

              <p className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                <ShieldCheck className="size-4 mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400" />

                <span>
                  Answers stream from OpenRouter and are billed to your OpenRouter account. Your key is
                  verified with a live call, then encrypted (AES-256) before storage — never logged, never
                  sent back to your browser.
                </span>
              </p>

              {saved && (
                <Alert status="success">
                  <Alert.Indicator />

                  <Alert.Content>
                    <Alert.Title>Key verified and saved</Alert.Title>

                    <Alert.Description>
                      Pick &ldquo;Q&amp;A · OpenRouter&rdquo; on the search page to choose a model.
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
