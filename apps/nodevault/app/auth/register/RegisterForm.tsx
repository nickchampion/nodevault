'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Alert, Button, Description, FieldError, Input, Label, Spinner, TextField,
} from '@heroui/react'
import { registerRequestSchema } from '@platform/components.contracts'
import { UserPlus } from 'lucide-react'
import type { FormEvent } from 'react'
import type { RegisterRequest } from '@platform/components.contracts'
import { api } from '../../../lib/api'
import { getSession, isSessionValid, useAuth } from '../../../lib/auth'
import { zodValidate } from '../../../lib/validation'
import { PhoneInput } from '../../../components/form/PhoneInput'
import type { FormErrors } from '../../../lib/validation'

const validateRegisterForm = zodValidate(registerRequestSchema)

const defaultState = (): RegisterRequest => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: undefined,
})

export const RegisterForm = () => {
  const router = useRouter()
  const { signIn } = useAuth()

  const [state, setState] = useState<RegisterRequest>(defaultState())
  const [errors, setErrors] = useState<FormErrors>({})
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // guest-only page
  useEffect(() => {
    if (isSessionValid(getSession())) {
      router.replace('/account')
    }
  }, [router])

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    const validationErrors = validateRegisterForm(state)

    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return

    setPending(true)
    setError(null)

    try {
      const response = await api.auth.register.mutate({ ...state })

      signIn(response)
      router.replace('/account')
    } catch (error_) {
      setError((error_ as Error).message || 'Something went wrong. Please try again.')
      setPending(false)
    }
  }

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={submit}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          isRequired
          isInvalid={Boolean(errors.firstName)}
          value={state.firstName}
          onChange={(firstName) => {
            setState({ ...state, firstName })
          }}
        >
          <Label>First name</Label>

          <Input
            placeholder="Alex"
            autoComplete="given-name"
          />

          <FieldError>{errors.firstName}</FieldError>
        </TextField>

        <TextField
          isRequired
          isInvalid={Boolean(errors.lastName)}
          value={state.lastName}
          onChange={(lastName) => {
            setState({ ...state, lastName })
          }}
        >
          <Label>Last name</Label>

          <Input
            placeholder="Taylor"
            autoComplete="family-name"
          />

          <FieldError>{errors.lastName}</FieldError>
        </TextField>
      </div>

      <TextField
        isRequired
        isInvalid={Boolean(errors.email)}
        value={state.email}
        onChange={(email) => {
          setState({ ...state, email })
        }}
      >
        <Label>Email</Label>

        <Input
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
        />

        <FieldError>{errors.email}</FieldError>
      </TextField>

      <div className="flex flex-col gap-1">
        <Label>Phone</Label>

        <PhoneInput
          value={state.phone ?? undefined}
          onChange={(phone) => {
            setState({ ...state, phone })
          }}
        />

        {errors['phone.number'] || errors['phone.countryCode']
          ? (
            <p className="text-sm text-danger">
              {errors['phone.number'] || errors['phone.countryCode']}
            </p>
          )
          : <Description>Optional</Description>}
      </div>

      <Button
        type="submit"
        isPending={pending}
        fullWidth
      >
        {pending ? <Spinner size="sm" /> : <UserPlus className="size-4" />}
        Create account
      </Button>

      {error && (
        <Alert status="danger">
          <Alert.Indicator />

          <Alert.Content>
            <Alert.Title>Registration failed</Alert.Title>

            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <p className="text-sm text-slate-400 text-center pt-2">
        Already have an account?
        {' '}

        <Link
          href="/auth/login"
          className="text-sky-400 font-semibold hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}
