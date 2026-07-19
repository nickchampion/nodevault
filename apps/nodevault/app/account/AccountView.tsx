'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@heroui/react'
import { Lock } from 'lucide-react'
import { getSession, isSessionValid, useAuth } from '../../lib/auth'
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

  return (
    <div>
      <PageHero
        eyebrow="Account"
        title={`Welcome back, ${session.user.firstName}`}
        description="Your vaults — group your documents and web pages, then search and ask questions."
      />

      <Container className="py-12">
        {session.account.gcpConfigured
          ? <VaultsCard />
          : (
            <Card>
              <Card.Content>
                <div className="flex flex-col items-center text-center gap-4 py-10">
                  <div className="flex items-center justify-center size-12 rounded-full bg-amber-500/10">
                    <Lock className="size-6 text-amber-600 dark:text-amber-400" />
                  </div>

                  <div className="space-y-1 max-w-xl">
                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                      Vaults are locked until you connect Google Cloud
                    </p>

                    <p className="text-slate-500 dark:text-slate-400">
                      NodeVault runs embeddings, search and conversations in your own GCP project.
                      Add your credentials in Settings — they are verified with a live call and stored encrypted.
                    </p>
                  </div>

                  <LinkButton href="/account/settings">
                    Connect Google Cloud
                  </LinkButton>
                </div>
              </Card.Content>
            </Card>
          )}
      </Container>
    </div>
  )
}
