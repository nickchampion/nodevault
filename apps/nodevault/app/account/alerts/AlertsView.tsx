'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, isSessionValid, useAuth } from '../../../lib/auth'
import { PageHero } from '../../../components/app/PageHero'
import { Container } from '../../../components/ui/Container'
import { AlertsCard } from './AlertsCard'

export const AlertsView = () => {
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
        title="Alerts"
        description="Follow topics that matter — we'll email you when new content touches on them."
      />

      <Container className="py-12 space-y-6">
        <AlertsCard />
      </Container>
    </div>
  )
}
