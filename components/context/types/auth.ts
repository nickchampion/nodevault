import { expiresInDays, toUtcIso } from '@platform/components.utils'

export type AuthTokens = {
  access: string
  expiresAtUTC: string
}

export class AuthInfo {
  expiresAtUTC: string
  accountName!: string
  firstName!: string
  lastName: string | undefined
  userId: string | undefined
  accountId: string | undefined
  roles: string[] = ['guest']

  constructor(fields: Partial<AuthInfo>) {
    Object.assign(this, fields ?? {})
    this.expiresAtUTC = toUtcIso(expiresInDays(3))
  }

  static guest() {
    return new AuthInfo({
      firstName: 'Guest',
      accountName: 'Guest',
    })
  }
}
