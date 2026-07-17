'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar } from '@heroui/react'
import { ChevronDown, LogIn, LogOut, UserRound } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { LinkButton } from '../ui/LinkButton'

/**
 * Account section for the header: a sign-in link when unauthenticated, otherwise the
 * user's initials avatar and name with a hover menu (CSS hover + focus-within, so it
 * stays keyboard accessible and works without a portal).
 */
export const AccountMenu = () => {
  const router = useRouter()
  const { session, isAuthenticated, signOut } = useAuth()

  if (!isAuthenticated || !session) {
    return (
      <LinkButton
        href="/auth/login"
        variant="outline"
        size="sm"
      >
        <LogIn className="size-4" />
        Sign in
      </LinkButton>
    )
  }

  const { firstName, lastName } = session.user
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

  const logout = () => {
    signOut()
    router.push('/')
  }

  return (
    <div className="relative group">
      <Link
        href="/account"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-800/60 transition-colors"
      >
        <Avatar size="sm">
          <Avatar.Fallback className="bg-sky-500/15 text-sky-400 text-xs font-semibold">
            {initials}
          </Avatar.Fallback>
        </Avatar>

        <span className="hidden sm:block text-sm font-medium text-slate-200">
          {firstName}
          {' '}
          {lastName}
        </span>

        <ChevronDown className="size-4 text-slate-500 transition-transform group-hover:rotate-180" />
      </Link>

      {/* pt-2 bridges the hover gap between the trigger and the panel */}
      <div className="absolute right-0 top-full pt-2 z-50 hidden group-hover:block group-focus-within:block">
        <div className="w-48 rounded-xl border border-slate-800 bg-slate-950 shadow-xl shadow-black/40 p-1.5">
          <Link
            href="/account"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <UserRound className="size-4 text-slate-400" />
            My account
          </Link>

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <LogOut className="size-4 text-slate-400" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
