import { eq } from 'drizzle-orm'
import { AuthInfo, type ApiHandler } from '@platform/components.context'
import { createAuthTokenForUser } from '@platform/components.utils.server'
import type { RegisterRequest, VerifyLoginResponse } from '@platform/components.contracts'
import { accounts, users } from '@platform/components.domain'
import { toAccountDto, toUserDto } from './mappers.js'

export const authRegister: ApiHandler<RegisterRequest, VerifyLoginResponse> = async (context) => {
  const {
    firstName, lastName, email, phone,
  } = context.event.payload

  const normalisedEmail = email.toLowerCase().trim()

  // friendly pre-check; the unique index on lower(email) is the real guarantee and
  // surfaces as a 409 if two registrations race
  const existing = await context.session.db.query.users.findFirst({
    columns: { id: true },
    where: eq(users.email, normalisedEmail),
  })

  if (existing) {
    return context.event.response.badRequestCustom('email', 'An account with this email address already exists')
  }

  const [account] = await context.session.db
    .insert(accounts)
    .values({ name: `${firstName.trim()} ${lastName.trim()}` })
    .returning()

  const [user] = await context.session.db
    .insert(users)
    .values({
      accountId: account.id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalisedEmail,
      phone: phone ? { countryCode: phone.countryCode, number: phone.number.replace(' ', '') } : null,
      roles: ['user'],
    })
    .returning()

  const authInfo = new AuthInfo({
    ...user,
    accountName: account.name,
    accountId: account.id,
  })

  const authTokens = createAuthTokenForUser(authInfo)
  const verifyResponse: VerifyLoginResponse = {
    user: toUserDto(user),
    account: toAccountDto(account),
    tokens: authTokens,
  }

  return context.event.response.created(verifyResponse)
}
