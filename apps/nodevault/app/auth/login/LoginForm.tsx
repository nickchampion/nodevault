'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Alert, Button, Card, FieldError, Input, Label, Spinner, TextField,
} from '@heroui/react'
import { loginRequestSchema } from '@platform/components.contracts'
import { Mail, MailCheck } from 'lucide-react'
import type { FormEvent } from 'react'
import { api } from '../../../lib/api'
import { getSession, isSessionValid, useAuth } from '../../../lib/auth'
import { zodValidate } from '../../../lib/validation'
import type { FormErrors } from '../../../lib/validation'

const validateLoginForm = zodValidate(loginRequestSchema)

export const LoginForm = () => {
  const router = useRouter()
  const searchParameters = useSearchParams()
  const { signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const code = searchParameters.get('code')
  const verifyStarted = useRef(false)

  // guest-only page — but let a sign-in link through even when a session already exists
  useEffect(() => {
    if (!code && isSessionValid(getSession())) {
      router.replace('/account')
    }
  }, [code, router])

  // arriving via the emailed sign-in link (/auth/login?code=...)
  useEffect(() => {
    if (!code || verifyStarted.current) return

    verifyStarted.current = true
    setVerifying(true)

    const verify = async () => {
      try {
        const response = await api.auth.verify.mutate({ code })

        signIn(response)
        router.replace('/account')
      } catch (error_) {
        setVerifyError((error_ as Error).message || 'This sign-in link is no longer valid. Please request a new one.')
        setVerifying(false)
      }
    }

    void verify()
  }, [code, router, signIn])

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    const validationErrors = validateLoginForm({ email })

    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return

    setPending(true)
    setError(null)

    try {
      await api.auth.login.mutate({ email })
      setSent(true)
    } catch (error_) {
      setError((error_ as Error).message || 'Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const reset = () => {
    setSent(false)
    setError(null)
    setErrors({})
    setEmail('')
  }

  if (verifying) {
    return (
      <Card>
        <Card.Content>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <Spinner
              size="lg"
              color="accent"
            />

            <p className="text-slate-400">
              Signing you in…
            </p>
          </div>
        </Card.Content>
      </Card>
    )
  }

  if (sent) {
    return (
      <Card>
        <Card.Content>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex items-center justify-center size-14 rounded-full bg-sky-500/10">
              <MailCheck className="size-7 text-sky-400" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white">
                Check your email
              </h3>

              <p className="text-slate-400 mt-1">
                If an account exists for
                {' '}
                {email}
                , a sign-in link is on its way.
                The link expires in 10 minutes.
              </p>
            </div>

            <Button
              variant="outline"
              onPress={reset}
            >
              Use a different email
            </Button>
          </div>
        </Card.Content>
      </Card>
    )
  }

  return (
    <>
      <form
        className="space-y-4"
        noValidate
        onSubmit={submit}
      >
        <TextField
          isRequired
          isInvalid={Boolean(errors.email)}
          value={email}
          onChange={setEmail}
        >
          <Label>Email</Label>

          <Input
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />

          <FieldError>{errors.email}</FieldError>
        </TextField>

        <Button
          type="submit"
          isPending={pending}
          fullWidth
        >
          {pending ? <Spinner size="sm" /> : <Mail className="size-4" />}
          Email me a sign-in link
        </Button>

        {error && (
          <Alert status="danger">
            <Alert.Indicator />

            <Alert.Content>
              <Alert.Title>Sign in failed</Alert.Title>

              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        <p className="text-sm text-slate-400 text-center pt-2">
          New here?
          {' '}

          <Link
            href="/auth/register"
            className="text-sky-400 font-semibold hover:underline"
          >
            Create an account
          </Link>
        </p>
      </form>

      {verifyError && (
        <Alert
          status="danger"
          className="mt-4"
        >
          <Alert.Indicator />

          <Alert.Content>
            <Alert.Title>Sign-in link problem</Alert.Title>

            <Alert.Description>{verifyError}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
    </>
  )
}
