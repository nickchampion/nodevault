'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Card } from '@heroui/react'
import { UserRound } from 'lucide-react'
import { getSession, isSessionValid, useAuth } from '../../../lib/auth'
import { PageHero } from '../../../components/app/PageHero'
import { Container } from '../../../components/ui/Container'
import { EditProfileForm } from './EditProfileForm'
import { GcpCredentialsCard } from './GcpCredentialsCard'

export const SettingsView = () => {
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
        title="Settings"
        description="Update your personal information and connect your own Google Cloud project."
      />

      <Container className="py-12 space-y-6">
        {!session.account.gcpConfigured && (
          <Alert status="warning">
            <Alert.Indicator />

            <Alert.Content>
              <Alert.Title>Connect your Google Cloud project to get started</Alert.Title>

              <Alert.Description>
                NodeVault runs entirely on your own GCP project — vaults, search and conversations stay
                locked until your credentials are added and verified below.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        {/* side by side on wide screens; the cards stack on smaller ones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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

          <GcpCredentialsCard />
        </div>
      </Container>
    </div>
  )
}
