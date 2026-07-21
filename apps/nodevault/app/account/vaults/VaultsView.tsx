'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, isSessionValid, useAuth } from '../../../lib/auth'
import { PageHero } from '../../../components/app/PageHero'
import { Container } from '../../../components/ui/Container'
import { VaultAccessGate } from '../../../components/app/VaultAccessGate'
import { VaultsCard } from '../VaultsCard'

export const VaultsView = () => {
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
        title="Your vaults"
        description="Group your documents and web pages into vaults, then search and ask questions from the home page."
      />

      <Container className="py-12 space-y-6">
        <VaultAccessGate>
          <VaultsCard />
        </VaultAccessGate>
      </Container>
    </div>
  )
}
