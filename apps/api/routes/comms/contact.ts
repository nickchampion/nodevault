import type { ApiHandler } from '@platform/components.context'
import { serverConfiguration } from '@platform/components.configuration.server'
import { createResendClient } from '@platform/integrations.resend'
import type { ContactRequest, OkResponse } from '@platform/components.contracts'

const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

export const commsContact: ApiHandler<ContactRequest, OkResponse> = async (context) => {
  const {
    name, email, phone, message, interests,
  } = context.event.payload

  const resend = createResendClient()

  const html = `
    <h2>New contact form message</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(`${phone.countryCode} ${phone.number}`)}</p>` : ''}
    ${interests.length > 0 ? `<p><strong>Interests:</strong> ${escapeHtml(interests.join(', '))}</p>` : ''}
    <p>${escapeHtml(message)}</p>
  `

  await resend.send({
    to: serverConfiguration.resend.contact,
    subject: `Contact form message from ${name}`,
    html,
  })

  context.log.info('Contact form message sent', { email })

  return context.event.response.ok()
}
