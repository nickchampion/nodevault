import { eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import { createResendClient } from '@platform/integrations.resend'
import type { UpdateProfileRequest, UserDto } from '@platform/components.nodevault.contracts'
import { users } from '@platform/components.nodevault.domain'
import { toUserDto } from '../auth/mappers.js'

export const accountUpdateProfile: ApiHandler<UpdateProfileRequest, UserDto> = async (context) => {
  const userId = context.user?.userId

  if (!userId) return context.event.response.unauthorised()

  const {
    firstName, lastName, email, phone,
  } = context.event.payload

  const normalisedEmail = email.toLowerCase().trim()

  const current = await context.session.db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!current) return context.event.response.notFound()

  // friendly pre-check; the unique index on lower(email) is the real guarantee and
  // surfaces as a 409 if two updates race
  if (normalisedEmail !== current.email) {
    const existing = await context.session.db.query.users.findFirst({
      columns: { id: true },
      where: eq(users.email, normalisedEmail),
    })

    if (existing) {
      return context.event.response.badRequestCustom('email', 'An account with this email address already exists')
    }
  }

  const [user] = await context.session.db
    .update(users)
    .set({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalisedEmail,
      phone: phone ? `${phone.countryCode} ${phone.number.replace(' ', '')}` : null,
      updatedAtUTC: new Date(),
    })
    .where(eq(users.id, userId))
    .returning()

  try {
    const resend = createResendClient()

    const html = await resend.render('/emails/profile-updated', { name: user.firstName })

    // notify the address on file before the change, so the owner still hears
    // about it if their email was the thing that changed
    await resend.send({
      to: current.email,
      subject: 'Your NodeVault account details were changed',
      html,
    })
  } catch (error) {
    // a failed notification email should not roll back the profile update
    context.log.error('Failed to send profile updated email', { error })
  }

  return context.event.response.ok(toUserDto(user))
}
