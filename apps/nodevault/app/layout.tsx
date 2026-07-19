import './globals.css'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { AccountNav } from '../components/app/AccountNav'
import { AppFooter } from '../components/app/AppFooter'
import { AppHeader } from '../components/app/AppHeader'

export const metadata: Metadata = {
  title: 'NodeVault — Semantic search for your documents',
  description: 'NodeVault - Everything you need to make your content searchable',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

// Applies the stored/system theme before paint, matching @heroui/react's useTheme
// (same localStorage key and class/data-theme target) so there's no light->dark flash.
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('heroui-theme');
    var resolved = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.add(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (error) {}
})();
`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>

      <body className="bg-white dark:bg-slate-950 min-h-screen flex flex-col antialiased text-slate-600 dark:text-slate-300">
        <AppHeader />

        <main className="flex-1">
          <AccountNav />

          {children}
        </main>

        <AppFooter />
      </body>
    </html>
  )
}
