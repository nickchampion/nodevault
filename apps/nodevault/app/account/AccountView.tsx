'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@heroui/react'
import { formatLocalDate } from '@platform/components.utils'
import { Building2 } from 'lucide-react'
import { getSession, isSessionValid, useAuth } from '../../lib/auth'
import { PageHero } from '../../components/app/PageHero'
import { Container } from '../../components/ui/Container'
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

  const memberSince = formatLocalDate(session.user.createdAtUTC, 'dd MMM yyyy')
  const sessionExpires = formatLocalDate(session.tokens.expiresAtUTC, 'dd MMM yyyy HH:mm')

  return (
    <div>
      <PageHero
        eyebrow="Account"
        title={`Welcome back, ${session.user.firstName}`}
        description="Manage your account."
      />

      <Container className="py-12">
        <div className="space-y-6">
          <Card>
            <Card.Header>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-10 rounded-lg bg-sky-500/10 shrink-0">
                  <Building2 className="size-5 text-sky-400" />
                </div>

                <div>
                  <Card.Title>
                    {session.account.name}
                  </Card.Title>

                  <Card.Description>
                    Your organisation
                  </Card.Description>
                </div>
              </div>
            </Card.Header>

            <Card.Content>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <div>
                  <dt className="text-sm font-semibold text-slate-400 mb-1">
                    Name
                  </dt>

                  <dd className="text-slate-100">
                    {session.user.firstName}
                    {' '}
                    {session.user.lastName}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-semibold text-slate-400 mb-1">
                    Email
                  </dt>

                  <dd className="text-slate-100">
                    {session.user.email}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-semibold text-slate-400 mb-1">
                    Member since
                  </dt>

                  <dd className="text-slate-100">
                    {memberSince}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-semibold text-slate-400 mb-1">
                    Session expires
                  </dt>

                  <dd className="text-slate-100">
                    {sessionExpires}
                  </dd>
                </div>
              </dl>
            </Card.Content>
          </Card>

          <VaultsCard />
        </div>
      </Container>
    </div>
  )
}
