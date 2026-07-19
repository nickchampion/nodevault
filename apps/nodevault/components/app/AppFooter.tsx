import Link from 'next/link'
import { Container } from '../ui/Container'
import { AppLogo } from './AppLogo'

const links = [
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/contact', label: 'Contact' },
  { href: '/about', label: 'About us' },
]

export const AppFooter = () => (
  <footer className="z-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
    <Container className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4 sm:h-16 sm:py-0">
      <p className="text-slate-500 dark:text-slate-400 text-sm">
        ©
        {' '}
        {new Date().getFullYear()}
        {' '}
        NodeVault
      </p>

      <nav className="flex items-center gap-5">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <AppLogo className="size-8" />
      </div>
    </Container>
  </footer>
)
