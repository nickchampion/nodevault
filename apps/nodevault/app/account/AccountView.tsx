'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Card, Spinner } from '@heroui/react'
import { Lock } from 'lucide-react'
import Link from 'next/link'
import {
  getSession, hasVaultAccess, isSessionValid, trialDaysLeft, useAuth,
} from '../../lib/auth'
import { PageHero } from '../../components/app/PageHero'
import { Container } from '../../components/ui/Container'
import { LinkButton } from '../../components/ui/LinkButton'
import { VaultsCard } from './VaultsCard'

export const AccountView = () => {
  const router = useRouter()
  const { session } = useAuth()

  // authenticated-only page
  useEffect(() => {
    if (!isSessionValid(getSession())) {
      router.replace('/auth/login')
    }
  }, [router])

  if (!session) return null

  // once real credentials are connected (either side), that account is locked to that
  // provider forever — no more "choose a provider" messaging after this
  const providerCommitted = session.account.gcpConfigured || session.account.aiProvider === 'openai'
  const migratingToOpenAi = session.account.aiProvider === 'openai' && session.account.openaiMigrating

  return (
    <div>
      <PageHero
        eyebrow="Account"
        title={`Welcome back, ${session.user.firstName}`}
        description="Your vaults — group your documents and web pages, then search and ask questions."
      />

      <Container className="py-12 space-y-6">
        {!providerCommitted && hasVaultAccess(session) && (
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

        {hasVaultAccess(session)
          ? <VaultsCard />
          : (
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
          )}
      </Container>
    </div>
  )
}
