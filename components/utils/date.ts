import {
  parseISO,
  isValid,
  format,
  isPast,
  isFuture,
  addDays,
  addHours,
  addMinutes,
  addSeconds,
  differenceInDays,
  differenceInHours,
  differenceInSeconds,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from 'date-fns'

type DateInput = Date | string

const toDate = (input: DateInput): Date => (typeof input === 'string' ? parseISO(input) : input)

export const nowUtcIso = (): string => new Date().toISOString()

export const toUtcIso = (date: DateInput): string => toDate(date).toISOString()

export const fromIso = (iso: string): Date => parseISO(iso)

export const isValidDate = (value: unknown): value is Date => value instanceof Date && isValid(value)

export const formatLocalDate = (date: DateInput, pattern = 'dd/MM/yyyy HH:mm'): string => format(toDate(date), pattern)

export const isExpired = (date: DateInput): boolean => isPast(toDate(date))

export const isFutureDate = (date: DateInput): boolean => isFuture(toDate(date))

export const expiresInSeconds = (seconds: number): Date => addSeconds(new Date(), seconds)

export const expiresInDays = (days: number): Date => addDays(new Date(), days)

export const diffInSeconds = (dateLeft: DateInput, dateRight: DateInput): number => differenceInSeconds(toDate(dateLeft), toDate(dateRight))

export const diffInHours = (dateLeft: DateInput, dateRight: DateInput): number => differenceInHours(toDate(dateLeft), toDate(dateRight))

export const diffInDays = (dateLeft: DateInput, dateRight: DateInput): number => differenceInDays(toDate(dateLeft), toDate(dateRight))

export const dayStart = (date: DateInput): Date => startOfDay(toDate(date))

export const dayEnd = (date: DateInput): Date => endOfDay(toDate(date))

export const monthStart = (date: DateInput): Date => startOfMonth(toDate(date))

export const monthEnd = (date: DateInput): Date => endOfMonth(toDate(date))

export {
  addDays, addHours, addMinutes, addSeconds,
}
