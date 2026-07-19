import { toUtcIso } from '@platform/components.utils'
import type { AccountDto, UserDto } from '@platform/components.contracts'
import type { Account, User } from '@platform/components.domain'

/**
 * Database rows never cross the API boundary: every response field is picked
 * explicitly here, so new columns stay private until deliberately exposed.
 */
export const toUserDto = (user: User): UserDto => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone
    ? {
      countryCode: user.phone.split(' ', 1)[0],
      number: user.phone.split(' ', 2)[1],
    }
    : null,
  roles: user.roles,
  createdAtUTC: toUtcIso(user.createdAtUTC),
})

export const toAccountDto = (account: Account): AccountDto => ({
  id: account.id,
  name: account.name,
  gcpConfigured: Boolean(account.gcpCredentials && account.gcpVerifiedAtUTC),
  createdAtUTC: toUtcIso(account.createdAtUTC),
})
