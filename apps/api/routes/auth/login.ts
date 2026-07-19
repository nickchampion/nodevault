import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import { expiresInSeconds } from '@platform/components.utils'
import { serverConfiguration } from '@platform/components.configuration.server'
import { base64Encode, encrypt } from '@platform/components.utils.server'
import { createResendClient } from '@platform/integrations.resend'
import type { LoginRequest, OkResponse } from '@platform/components.nodevault.contracts'
import { loginTokens, users } from '@platform/components.nodevault.domain'

const TOKEN_TTL_SECONDS = 10 * 60

export const authLogin: ApiHandler<LoginRequest, OkResponse> = async (context) => {
  const { email } = context.event.payload

  const user = await context.session.db.query.users.findFirst({
    where: and(eq(users.email, email.toLowerCase().trim()), eq(users.status, 'active')),
  })

  if (!user) {
    return context.event.response.ok()
  }

  const [token] = await context.session.db
    .insert(loginTokens)
    .values({
      userId: user.id,
      email: user.email,
      expiresAtUTC: expiresInSeconds(TOKEN_TTL_SECONDS),
    })
    .returning({ id: loginTokens.id })

  const code = encrypt(`${token.id}_${randomUUID()}`, serverConfiguration.environment.key, serverConfiguration.environment.salt)

  const resend = createResendClient()

  const html = await resend.render('/emails/login', {
    name: user.firstName ?? user.email,
    code: base64Encode(code),
  })

  await resend.send({
    to: user.email,
    subject: 'Your NodeVault sign-in link',
    html,
  })

  return context.event.response.ok()
}
