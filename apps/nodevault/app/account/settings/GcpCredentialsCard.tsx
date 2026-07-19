'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Alert, Button, Card, Description, FieldError, Input, Label, Spinner, TextArea, TextField,
} from '@heroui/react'
import { setGcpCredentialsRequestSchema } from '@platform/components.contracts'
import { formatLocalDate } from '@platform/components.utils'
import { Cloud, Save, ShieldCheck } from 'lucide-react'
import type { SubmitEvent } from 'react'
import type { GcpCredentialsStatus, SetGcpCredentialsRequest } from '@platform/components.contracts'
import { api } from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import { zodValidate } from '../../../lib/validation'
import type { FormErrors } from '../../../lib/validation'

const validateCredentialsForm = zodValidate(setGcpCredentialsRequestSchema)

const DEFAULT_LOCATION = 'europe-west2'

/** badRequest responses carry a validation array alongside the generic envelope message. */
const serverValidation = (error: unknown): { path: string, message: string }[] => {
  const data = (error as { data?: { validation?: { path: string, message: string }[] } }).data

  return data?.validation ?? []
}

/**
 * Bring-your-own-GCP: connect the account's own Google Cloud project. The key is
 * verified with live Vertex AI calls when saved, encrypted at rest, and never returned
 * to the browser — the status endpoint only reports metadata.
 */
export const GcpCredentialsCard = () => {
  const { session, signIn } = useAuth()

  const [status, setStatus] = useState<GcpCredentialsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<SetGcpCredentialsRequest>({
    projectId: '',
    location: DEFAULT_LOCATION,
    serviceAccountKey: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const current = await api.account.gcpStatus.query()

        if (cancelled) return

        setStatus(current)

        if (current.configured) {
          setState(previous => ({
            ...previous,
            projectId: current.projectId ?? '',
            location: current.location ?? DEFAULT_LOCATION,
          }))
        }
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

    const validationErrors = validateCredentialsForm(state)

    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return

    setPending(true)
    setSaved(false)
    setError(null)

    try {
      const result = await api.account.setGcpCredentials.mutate({ ...state })

      setStatus(result)
      // the pasted key is write-only: clear it from the form the moment it's stored
      setState(previous => ({ ...previous, serviceAccountKey: '' }))
      setSaved(true)

      if (session) {
        signIn({ ...session, account: { ...session.account, gcpConfigured: result.configured } })
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
          <div className="flex items-center justify-center size-10 rounded-lg bg-sky-500/10 shrink-0">
            <Cloud className="size-5 text-sky-600 dark:text-sky-400" />
          </div>

          <div>
            <Card.Title>
              Google Cloud credentials
            </Card.Title>

            <Card.Description>
              NodeVault runs on your own GCP project for embeddings, Gemini and Vertex AI Search
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
                    <Alert.Title>
                      Connected to
                      {' '}
                      {status.projectId}
                    </Alert.Title>

                    <Alert.Description>
                      Verified
                      {' '}
                      {status.verifiedAtUTC ? formatLocalDate(status.verifiedAtUTC, 'dd MMM yyyy HH:mm') : ''}
                      . Your key is stored encrypted and never shown again — paste a new key below to replace it.
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 text-sm text-slate-600 dark:text-slate-300 space-y-2">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  Your project needs, before saving:
                </p>

                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    The
                    {' '}
                    <span className="font-medium">Vertex AI API</span>
                    {' '}
                    and
                    {' '}
                    <span className="font-medium">Discovery Engine API</span>
                    {' '}
                    enabled (billing must be active)
                  </li>

                  <li>
                    A service account with the
                    {' '}
                    <span className="font-medium">Vertex AI User</span>
                    {' '}
                    and
                    {' '}
                    <span className="font-medium">Discovery Engine Admin</span>
                    {' '}
                    roles
                  </li>

                  <li>
                    A global Vertex AI Search data store with the ID
                    {' '}
                    <code className="font-mono text-xs">nodevault-assets</code>
                  </li>
                </ul>

                <p>
                  New to Google Cloud?
                  {' '}
                  <Link
                    href="/help/gcp"
                    className="text-sky-600 dark:text-sky-400 font-medium hover:underline"
                  >
                    Follow the step-by-step setup guide
                  </Link>
                  {' '}
                  — it covers creating an account, enabling the APIs and downloading your key.
                </p>
              </div>

              <form
                className="space-y-4"
                noValidate
                onSubmit={submit}
              >
                <TextField
                  isRequired
                  isInvalid={Boolean(errors.projectId)}
                  value={state.projectId}
                  onChange={(projectId) => {
                    setState({ ...state, projectId })
                  }}
                >
                  <Label>Project ID</Label>

                  <Input placeholder="my-gcp-project" />

                  <Description>The GCP project your credentials belong to</Description>

                  <FieldError>{errors.projectId}</FieldError>
                </TextField>

                <TextField
                  isRequired
                  isInvalid={Boolean(errors.location)}
                  value={state.location}
                  onChange={(location) => {
                    setState({ ...state, location })
                  }}
                >
                  <Label>Vertex AI region</Label>

                  <Input placeholder={DEFAULT_LOCATION} />

                  <Description>
                    The region embeddings run in (e.g. europe-west2, us-central1)
                  </Description>

                  <FieldError>{errors.location}</FieldError>
                </TextField>

                <TextField
                  isRequired
                  isInvalid={Boolean(errors.serviceAccountKey)}
                  value={state.serviceAccountKey}
                  onChange={(serviceAccountKey) => {
                    setState({ ...state, serviceAccountKey })
                  }}
                >
                  <Label>Service account key</Label>

                  <TextArea
                    placeholder='{ "type": "service_account", "project_id": "…", … }'
                    rows={8}
                    className="font-mono text-xs"
                  />

                  <Description>
                    Paste the full JSON key file downloaded from Google Cloud
                  </Description>

                  <FieldError>{errors.serviceAccountKey}</FieldError>
                </TextField>

                <Button
                  type="submit"
                  isPending={pending}
                  fullWidth
                >
                  {pending ? <Spinner size="sm" /> : <Save className="size-4" />}
                  {pending ? 'Verifying with Google Cloud…' : 'Verify & save credentials'}
                </Button>
              </form>

              <p className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                <ShieldCheck className="size-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />

                <span>
                  Your key is verified with a live Vertex AI call, then encrypted (AES-256) before it is stored.
                  It is never logged and never sent back to your browser.
                </span>
              </p>

              {saved && (
                <Alert status="success">
                  <Alert.Indicator />

                  <Alert.Content>
                    <Alert.Title>Credentials verified and saved</Alert.Title>

                    <Alert.Description>
                      Your Google Cloud project is connected — vaults are ready to use.
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
