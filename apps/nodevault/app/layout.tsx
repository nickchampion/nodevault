import './globals.css'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className="light"
    >
      <body className="bg-white min-h-screen flex flex-col antialiased text-slate-700">
        <AppHeader />

        <main className="flex-1">
          {children}
        </main>

        <AppFooter />
      </body>
    </html>
  )
}
