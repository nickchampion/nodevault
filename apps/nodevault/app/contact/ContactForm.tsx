'use client'

import { useState } from 'react'
import {
  Alert, Button, Card, Description, FieldError, Input, Label, Spinner, TextArea, TextField,
} from '@heroui/react'
import { contactRequestSchema } from '@platform/components.nodevault.contracts'
import { Check, Send } from 'lucide-react'
import type { SubmitEvent } from 'react'
import type { inferRouterInputs } from '@trpc/server'
import type { AppRouter } from '@platform/apps.api'
import { api } from '../../lib/api'
import { zodValidate } from '../../lib/validation'
import { PhoneInput } from '../../components/form/PhoneInput'
import type { FormErrors } from '../../lib/validation'

type ContactRequest = inferRouterInputs<AppRouter>['comms']['contact']

type FormState = Omit<ContactRequest, 'interests'>

const validateContactForm = zodValidate(contactRequestSchema)

const defaultState = (): FormState => ({
  name: '',
  email: '',
  phone: undefined,
  message: '',
})

export const ContactForm = () => {
  const [state, setState] = useState<FormState>(defaultState())
  const [errors, setErrors] = useState<FormErrors>({})
  const [pending, setPending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()

    const validationErrors = validateContactForm({ ...state, interests: ['other'] })

    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return

    setPending(true)
    setError(null)

    try {
      await api.comms.contact.mutate({ ...state, interests: ['other'] })
      setSubmitted(true)
    } catch (error_) {
      setError((error_ as Error).message || 'Failed to send your message. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const reset = () => {
    setSubmitted(false)
    setError(null)
    setErrors({})
    setState(defaultState())
  }

  if (submitted) {
    return (
      <Card>
        <Card.Content>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex items-center justify-center size-14 rounded-full bg-sky-500/10">
              <Check className="size-7 text-sky-600 dark:text-sky-400" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Message sent
              </h3>

              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Thanks
                {' '}
                {state.name}
                , I&apos;ll be in touch shortly.
              </p>
            </div>

            <Button
              variant="outline"
              onPress={reset}
            >
              Send another message
            </Button>
          </div>
        </Card.Content>
      </Card>
    )
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
          isInvalid={Boolean(errors.name)}
          value={state.name}
          onChange={(name) => {
            setState({ ...state, name })
          }}
        >
          <Label>Name</Label>

          <Input placeholder="Your full name" />

          <FieldError>{errors.name}</FieldError>
        </TextField>

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
          />

          <FieldError>{errors.email}</FieldError>
        </TextField>
      </div>

      <div className="flex flex-col gap-1">
        <Label>Phone</Label>

        <PhoneInput
          value={state.phone}
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

      <TextField
        isRequired
        isInvalid={Boolean(errors.message)}
        value={state.message}
        onChange={(message) => {
          setState({ ...state, message })
        }}
      >
        <Label>Message</Label>

        <TextArea
          placeholder="What would you like to talk about?"
          rows={6}
        />

        <FieldError>{errors.message}</FieldError>
      </TextField>

      <div className="flex justify-end pt-1">
        <Button
          type="submit"
          isPending={pending}
        >
          {pending ? <Spinner size="sm" /> : <Send className="size-4" />}
          Send message
        </Button>
      </div>

      {error && (
        <Alert status="danger">
          <Alert.Indicator />

          <Alert.Content>
            <Alert.Title>Something went wrong</Alert.Title>

            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
    </form>
  )
}
