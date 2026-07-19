'use client'

import { useSyncExternalStore } from 'react'
import { isExpired } from '@platform/components.utils'
import type { VerifyLoginResponse } from '@platform/components.nodevault.contracts'

export type AuthSession = VerifyLoginResponse

const SESSION_COOKIE = 'nodevault-session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 3 // matches the 3-day auth token lifetime

const listeners = new Set<() => void>()

const cache: { raw: string | null, session: AuthSession | null } = { raw: null, session: null }

const readCookie = (): string | null => {
  if (typeof document === 'undefined') return null

  const match = document.cookie.split('; ').find(part => part.startsWith(`${SESSION_COOKIE}=`))

  return match ? match.slice(SESSION_COOKIE.length + 1) : null
}

/** Current session, read straight from the cookie (client only — null on the server). */
export const getSession = (): AuthSession | null => {
  const raw = readCookie()

  if (raw === cache.raw) return cache.session

  cache.raw = raw

  try {
    cache.session = raw ? JSON.parse(decodeURIComponent(raw)) as AuthSession : null
  } catch {
    cache.session = null
  }

  return cache.session
}

export const isSessionValid = (session: AuthSession | null): boolean => Boolean(session?.tokens.access) && !isExpired(session!.tokens.expiresAtUTC)

/** Whole days left of the free GCP trial (0 once it has ended, or for pre-trial-era sessions). */
export const trialDaysLeft = (session: AuthSession | null): number => {
  const endsAt = session?.account.gcpTrialEndsAtUTC

  if (!endsAt) return 0

  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000))
}

/**
 * Vault features are usable with the account's connected provider: for a Gemini-track
 * account, its own GCP credentials or an active trial; for an OpenAI-track account, its
 * own verified key (there's no trial once switched).
 */
export const hasVaultAccess = (session: AuthSession | null): boolean => {
  if (!session) return false

  if (session.account.aiProvider === 'openai') return session.account.openaiConfigured && !session.account.openaiMigrating

  return session.account.gcpConfigured || trialDaysLeft(session) > 0
}

const writeSession = (session: AuthSession | null) => {
  document.cookie = session
    ? `${SESSION_COOKIE}=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; samesite=lax`
    : `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`

  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

/**
 * Cookie-backed auth session (SSR-safe). `signIn()` persists the contract response
 * from auth.verify / auth.register for the UI and API client to read.
 */
export const useAuth = () => {
  const session = useSyncExternalStore(subscribe, getSession, () => null)

  return {
    session,
    isAuthenticated: isSessionValid(session),
    signIn: (response: AuthSession) => {
      writeSession(response)
    },
    signOut: () => {
      writeSession(null)
    },
  }
}
