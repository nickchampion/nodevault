'use client'

import { useState } from 'react'
import {
  Alert, Button, Description, FieldError, Input, Label, Spinner, TextField,
} from '@heroui/react'
import { updateProfileRequestSchema } from '@platform/components.nodevault.contracts'
import { Save } from 'lucide-react'
import type { SubmitEvent } from 'react'
import type { UpdateProfileRequest } from '@platform/components.nodevault.contracts'
import type { AuthSession } from '../../../lib/auth'
import { api } from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import { zodValidate } from '../../../lib/validation'
import { PhoneInput } from '../../../components/form/PhoneInput'
import type { FormErrors } from '../../../lib/validation'

const validateEditProfileForm = zodValidate(updateProfileRequestSchema)

export const EditProfileForm = () => {
  const { session } = useAuth()

  if (!session) return null

  // remounts with fresh defaults if the signed-in user changes
  return (
    <EditProfileFields
      key={session.user.id}
      session={session}
    />
  )
}

const EditProfileFields = ({ session }: { session: AuthSession }) => {
  const { signIn } = useAuth()

  const [state, setState] = useState<UpdateProfileRequest>(() => ({
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    email: session.user.email,
    phone: session.user.phone ?? undefined,
  }))
  const [errors, setErrors] = useState<FormErrors>({})
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()

    const validationErrors = validateEditProfileForm(state)

    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return

    setPending(true)
    setSaved(false)
    setError(null)

    try {
      const user = await api.account.updateProfile.mutate({ ...state })

      signIn({ ...session, user })
      setSaved(true)
    } catch (error_) {
      setError((error_ as Error).message || 'Something went wrong. Please try again.')
    } finally {
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
        {pending ? <Spinner size="sm" /> : <Save className="size-4" />}
        Save changes
      </Button>

      {saved && (
        <Alert status="success">
          <Alert.Indicator />

          <Alert.Content>
            <Alert.Title>Profile updated</Alert.Title>

            <Alert.Description>Your changes have been saved.</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {error && (
        <Alert status="danger">
          <Alert.Indicator />

          <Alert.Content>
            <Alert.Title>Update failed</Alert.Title>

            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
    </form>
  )
}
