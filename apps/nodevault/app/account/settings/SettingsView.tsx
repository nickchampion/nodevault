'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Card } from '@heroui/react'
import { UserRound } from 'lucide-react'
import type { AiProvider } from '@platform/components.nodevault.contracts'
import {
  getSession, isSessionValid, trialDaysLeft, useAuth,
} from '../../../lib/auth'
import { PageHero } from '../../../components/app/PageHero'
import { Container } from '../../../components/ui/Container'
import { EditProfileForm } from './EditProfileForm'
import { GcpCredentialsCard } from './GcpCredentialsCard'
import { OpenAiCredentialsCard } from './OpenAiCredentialsCard'
import { OpenRouterCredentialsCard } from './OpenRouterCredentialsCard'
import { ProviderChoice } from './ProviderChoice'

export const SettingsView = () => {
  const router = useRouter()
  const { session } = useAuth()
  const [chosenProvider, setChosenProvider] = useState<AiProvider | null>(null)

  useEffect(() => {
    if (!isSessionValid(getSession())) {
      router.replace('/auth/login')
    }
  }, [router])

  if (!session) return null

  // once real credentials are connected (either side), that account is locked to that
  // provider forever and there's nothing left to choose
  const providerCommitted = session.account.gcpConfigured || session.account.aiProvider === 'openai'
  const activeProvider: AiProvider | null = providerCommitted ? session.account.aiProvider : chosenProvider

  return (
    <div>
      <PageHero
        eyebrow="Account"
        title="Settings"
        description="Update your personal information and connect your AI provider."
      />

      <Container className="py-12 space-y-6">
        {!providerCommitted && (
          trialDaysLeft(session) > 0
            ? (
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
                    NodeVault is free for your first 7 days, running on our Google Cloud project.
                    Choose and connect your AI provider — Google Cloud or OpenAI — below before the
                    trial ends to keep your vaults, search and conversations working.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )
            : (
              <Alert status="warning">
                <Alert.Indicator />

                <Alert.Content>
                  <Alert.Title>Your free trial has ended</Alert.Title>

                  <Alert.Description>
                    Vaults, search and conversations are locked until you choose and connect an AI
                    provider — Google Cloud or OpenAI — below.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">
            <Card>
              <Card.Header>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-10 rounded-lg bg-sky-500/10 shrink-0">
                    <UserRound className="size-5 text-sky-600 dark:text-sky-400" />
                  </div>

                  <div>
                    <Card.Title>
                      Personal information
                    </Card.Title>

                    <Card.Description>
                      Your name, email and phone number
                    </Card.Description>
                  </div>
                </div>
              </Card.Header>

              <Card.Content>
                <EditProfileForm />
              </Card.Content>
            </Card>

            {providerCommitted && <OpenRouterCredentialsCard />}
          </div>

          <div className="space-y-3">
            {!providerCommitted && activeProvider && (
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setChosenProvider(null)}
              >
                ← Choose a different provider
              </Button>
            )}

            {activeProvider === null && <ProviderChoice onChooseAction={setChosenProvider} />}
            {activeProvider === 'gemini' && <GcpCredentialsCard />}
            {activeProvider === 'openai' && <OpenAiCredentialsCard />}
          </div>
        </div>
      </Container>
    </div>
  )
}
