'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell, MessagesSquare, Search, Settings, Vault,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { Container } from '../ui/Container'

type AccountNavItem = {
  href: string
  label: string
  icon: LucideIcon
  // exact-match items don't highlight for their sub-routes (e.g. /account vs /account/conversations)
  exact?: boolean
}

// future account pages join this list
const items: AccountNavItem[] = [
  {
    href: '/account', label: 'Search', icon: Search, exact: true,
  },
  { href: '/account/vaults', label: 'Vaults', icon: Vault },
  { href: '/account/conversations', label: 'Conversations', icon: MessagesSquare },
  { href: '/account/alerts', label: 'Alerts', icon: Bell },
  { href: '/account/settings', label: 'Settings', icon: Settings },
]

/**
 * In-content account navigation, shown on every page while signed in — a slim bar of
 * pill links at the top of the main content area (distinct from the header's
 * AccountMenu dropdown).
 */
export const AccountNav = () => {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) return null

  const isActive = (item: AccountNavItem) => (
    item.exact ? pathname === item.href : pathname.startsWith(item.href)
  )

  return (
    <nav
      aria-label="Account"
      className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40"
    >
      <Container className="flex items-center gap-1.5 py-2 overflow-x-auto">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={active
                ? 'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 whitespace-nowrap'
                : 'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap'}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </Container>
    </nav>
  )
}
