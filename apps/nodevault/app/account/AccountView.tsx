'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, isSessionValid, useAuth } from '../../lib/auth'
import { PageHero } from '../../components/app/PageHero'
import { Container } from '../../components/ui/Container'
import { VaultAccessGate } from '../../components/app/VaultAccessGate'
import { SearchExperience } from '../../components/app/SearchExperience'

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
        description="Search and ask questions across the documents and web pages in your vaults."
      />

      <Container className="py-12 space-y-6">
        <VaultAccessGate>
          <SearchExperience />
        </VaultAccessGate>
      </Container>
    </div>
  )
}
