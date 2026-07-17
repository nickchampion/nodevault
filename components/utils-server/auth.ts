import { serverConfiguration } from '@platform/components.configuration'
import { AuthInfo, type AuthTokens } from '@platform/components.context'
import { base64Decode, base64Encode, decrypt, encrypt } from '@platform/components.utils.server'

export const createAuthTokenForUser = (authInfo: AuthInfo): AuthTokens => {
  const access = encrypt(JSON.stringify(authInfo), serverConfiguration.environment.key, serverConfiguration.environment.salt)

  return {
    access: base64Encode(access),
    expiresAtUTC: authInfo.expiresAtUTC,
  }
}

export const createAuthInfoFromToken = (token?: string | null): AuthInfo => {
  if (!token) return AuthInfo.guest()

  try {
    return JSON.parse(decrypt(base64Decode(token), serverConfiguration.environment.key, serverConfiguration.environment.salt)!) as AuthInfo
  } catch {
    return AuthInfo.guest()
  }
}
