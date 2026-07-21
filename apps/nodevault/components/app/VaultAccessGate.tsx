'use client'

import type { ReactNode } from 'react'
import { Alert, Card, Spinner } from '@heroui/react'
import { Lock } from 'lucide-react'
import Link from 'next/link'
import {
  hasVaultAccess, trialDaysLeft, useAuth,
} from '../../lib/auth'
import { LinkButton } from '../ui/LinkButton'

/**
 * Gates vault-backed features (search, Q&A, vault management) on the account having an
 * active AI provider or a live trial. When access is granted it renders a trial banner
 * (until real credentials are connected) followed by `children`; otherwise it shows the
 * locked / migrating card that points at Settings. Shared by the search home and the
 * vaults page so the gate lives in one place.
 */
export const VaultAccessGate = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth()

  if (!session) return null

  // once real credentials are connected (either side), that account is locked to that
  // provider forever — no more "choose a provider" messaging after this
  const providerCommitted = session.account.gcpConfigured || session.account.aiProvider === 'openai'
  const migratingToOpenAi = session.account.aiProvider === 'openai' && session.account.openaiMigrating

  if (hasVaultAccess(session)) {
    return (
      <>
        {!providerCommitted && (
          <Alert status="accent">
            <Alert.Indicator />

            <Alert.Content>
              <Alert.Title>
                Free trial —
                {' '}
                {trialDaysLeft(session)}
                {' '}
                {trialDaysLeft(session) === 1 ? 'day' : 'days'}
                {' '}
                left
              </Alert.Title>

              <Alert.Description>
                You&apos;re currently running on our Google Cloud project.
                {' '}
                <Link
                  href="/account/settings"
                  className="font-medium underline"
                >
                  Choose and connect your AI provider — Google Cloud or OpenAI
                </Link>
                {' '}
                before the trial ends to keep your vaults working.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        {children}
      </>
    )
  }

  return (
    <Card>
      <Card.Content>
        <div className="flex flex-col items-center text-center gap-4 py-10">
          {migratingToOpenAi
            ? (
              <>
                <div className="flex items-center justify-center size-12 rounded-full bg-sky-500/10">
                  <Spinner size="sm" />
                </div>

                <div className="space-y-1 max-w-xl">
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                    Migrating your vaults to OpenAI…
                  </p>

                  <p className="text-slate-500 dark:text-slate-400">
                    Existing content is being re-embedded and re-indexed on your OpenAI
                    account — this only takes a few minutes. This page will unlock
                    automatically once it&apos;s done.
                  </p>
                </div>
              </>
            )
            : (
              <>
                <div className="flex items-center justify-center size-12 rounded-full bg-amber-500/10">
                  <Lock className="size-6 text-amber-600 dark:text-amber-400" />
                </div>

                <div className="space-y-1 max-w-xl">
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                    Your 7-day free trial has ended
                  </p>

                  <p className="text-slate-500 dark:text-slate-400">
                    To keep using vaults, choose and connect an AI provider — Google
                    Cloud or OpenAI — in Settings. Your credentials are verified with a
                    live call and stored encrypted.
                  </p>
                </div>

                <LinkButton href="/account/settings">
                  Connect an AI provider
                </LinkButton>
              </>
            )}
        </div>
      </Card.Content>
    </Card>
  )
}
