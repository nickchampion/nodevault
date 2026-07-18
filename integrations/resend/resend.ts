import { Resend } from 'resend'
import { serverConfiguration } from '@platform/components.configuration.server'
import { AppError } from '@platform/components.domain'

export type SendEmailOptions = {
  to: string
  subject: string
  html: string
}

export type ResendClient = ReturnType<typeof createResendClient>

export const createResendClient = () => {
  const resend = new Resend(serverConfiguration.resend.apiKey)

  return {
    send: ({ to, subject, html }: SendEmailOptions) => resend.emails.send({
      from: serverConfiguration.resend.from,
      to,
      subject,
      html,
    }),
    render: async (path: string, parameters: Record<string, string>, headers?: Record<string, string>): Promise<string> => {
      const url = `${serverConfiguration.app}${path}?${new URLSearchParams(parameters)}`

      const res = await fetch(url, {
        headers: headers,
      })

      if (!res.ok) throw new AppError('internal', `Email render failed [${res.status}]: ${url}`)

      return res.text()
    },
  }
}
