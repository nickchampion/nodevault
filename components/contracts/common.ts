import { z } from 'zod'

/** Body returned by handlers that respond `ok()` with no payload. */
export const okResponseSchema = z.object({
  status: z.literal(200),
  message: z.string(),
})

export type OkResponse = z.infer<typeof okResponseSchema>

export const phoneSchema = z.object({
  countryCode: z.string().min(1, 'Select a country code').max(4),
  number: z.string().regex(/^[0-9 ]{6,15}$/, 'Enter a valid phone number'),
})

export type Phone = z.infer<typeof phoneSchema>

export const userRoleSchema = z.enum(['guest', 'user', 'admin'])

export type UserRole = z.infer<typeof userRoleSchema>

export type Country = {

  /** ISO 3166-1 alpha-2 code */
  iso: string
  name: string

  /** International dialling code, including the leading + */
  countryCode: string
}

/** Countries offered for phone input, UK first as the default. */
export const Countries: Country[] = [
  { iso: 'gb', name: 'United Kingdom', countryCode: '+44' },
  { iso: 'ie', name: 'Ireland', countryCode: '+353' },
  { iso: 'us', name: 'United States', countryCode: '+1' },
  { iso: 'ca', name: 'Canada', countryCode: '+1' },
  { iso: 'au', name: 'Australia', countryCode: '+61' },
  { iso: 'nz', name: 'New Zealand', countryCode: '+64' },
  { iso: 'at', name: 'Austria', countryCode: '+43' },
  { iso: 'be', name: 'Belgium', countryCode: '+32' },
  { iso: 'ch', name: 'Switzerland', countryCode: '+41' },
  { iso: 'cz', name: 'Czechia', countryCode: '+420' },
  { iso: 'de', name: 'Germany', countryCode: '+49' },
  { iso: 'dk', name: 'Denmark', countryCode: '+45' },
  { iso: 'es', name: 'Spain', countryCode: '+34' },
  { iso: 'fi', name: 'Finland', countryCode: '+358' },
  { iso: 'fr', name: 'France', countryCode: '+33' },
  { iso: 'gr', name: 'Greece', countryCode: '+30' },
  { iso: 'hu', name: 'Hungary', countryCode: '+36' },
  { iso: 'it', name: 'Italy', countryCode: '+39' },
  { iso: 'lu', name: 'Luxembourg', countryCode: '+352' },
  { iso: 'nl', name: 'Netherlands', countryCode: '+31' },
  { iso: 'no', name: 'Norway', countryCode: '+47' },
  { iso: 'pl', name: 'Poland', countryCode: '+48' },
  { iso: 'pt', name: 'Portugal', countryCode: '+351' },
  { iso: 'ro', name: 'Romania', countryCode: '+40' },
  { iso: 'se', name: 'Sweden', countryCode: '+46' },
  { iso: 'ae', name: 'United Arab Emirates', countryCode: '+971' },
  { iso: 'hk', name: 'Hong Kong', countryCode: '+852' },
  { iso: 'id', name: 'Indonesia', countryCode: '+62' },
  { iso: 'in', name: 'India', countryCode: '+91' },
  { iso: 'jp', name: 'Japan', countryCode: '+81' },
  { iso: 'kr', name: 'South Korea', countryCode: '+82' },
  { iso: 'my', name: 'Malaysia', countryCode: '+60' },
  { iso: 'ph', name: 'Philippines', countryCode: '+63' },
  { iso: 'sg', name: 'Singapore', countryCode: '+65' },
  { iso: 'th', name: 'Thailand', countryCode: '+66' },
  { iso: 'vn', name: 'Vietnam', countryCode: '+84' },
  { iso: 'za', name: 'South Africa', countryCode: '+27' },
  { iso: 'br', name: 'Brazil', countryCode: '+55' },
  { iso: 'mx', name: 'Mexico', countryCode: '+52' },
]
