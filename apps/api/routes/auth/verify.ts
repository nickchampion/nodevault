import { and, eq, gt } from 'drizzle-orm'
import { AuthInfo, type ApiHandler } from '@platform/components.context'
import { base64Decode, createAuthTokenForUser, decrypt } from '@platform/components.utils.server'
import { serverConfiguration } from '@platform/components.configuration.server'
import { AppError, accounts, loginTokens, users } from '@platform/components.domain'
import type { VerifyLoginResponse, VerifyRequest } from '@platform/components.contracts'
import { toAccountDto, toUserDto } from './mappers.js'

const TOKEN_ID_PATTERN = /^\d+$/

export const authVerify: ApiHandler<VerifyRequest, VerifyLoginResponse> = async (context) => {
  const { code } = context.event.payload

  try {
    const decryptedToken = decrypt(base64Decode(code), serverConfiguration.environment.key, serverConfiguration.environment.salt)

    if (!decryptedToken) {
      throw new AppError('auth', 'You have provided an invalid login token, please login again to receive a new code')
    }

    const [tokenIdPart] = decryptedToken.split('_')

    if (!TOKEN_ID_PATTERN.test(tokenIdPart)) {
      throw new AppError('auth', 'You have provided an invalid login token, please login again to receive a new code')
    }

    const loginTokenId = Number(tokenIdPart)

    // consume the token atomically: only an unused, unexpired token matches
    const [loginToken] = await context.session.db
      .update(loginTokens)
      .set({ used: true })
      .where(and(
        eq(loginTokens.id, loginTokenId),
        eq(loginTokens.used, false),
        gt(loginTokens.expiresAtUTC, new Date()),
      ))
      .returning({ userId: loginTokens.userId })

    if (!loginToken) {
      throw new AppError('auth', 'Your token has expired, please login again to receive a new token')
    }

    const user = await context.session.db.query.users.findFirst({
      where: and(eq(users.id, loginToken.userId), eq(users.status, 'active')),
    })

    if (!user) {
      throw new AppError('auth', 'Your account is no longer active')
    }

    const account = await context.session.db.query.accounts.findFirst({
      where: eq(accounts.id, user.accountId),
    })

    if (!account) {
      throw new AppError('auth', 'Your account is no longer active')
    }

    const authInfo = new AuthInfo({
      ...user,
      userId: user.id,
      accountName: account.name,
      accountId: account.id,
    })
    const authTokens = createAuthTokenForUser(authInfo)
    const verifyResponse: VerifyLoginResponse = {
      user: toUserDto(user),
      account: toAccountDto(account),
      tokens: authTokens,
    }

    return context.event.response.ok(verifyResponse)
  } catch (error: any) {
    return context.event.response.badRequestCustom('auth', error.message)
  }
}
