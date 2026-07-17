'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card } from '@heroui/react'
import { formatLocalDate } from '@platform/components.utils'
import { Building2, LogOut, Workflow } from 'lucide-react'
import { getSession, isSessionValid, useAuth } from '../../lib/auth'
import { PageHero } from '../../components/app/PageHero'
import { Container } from '../../components/ui/Container'

export const AccountView = () => {
  const router = useRouter()
  const { session, signOut } = useAuth()

  // authenticated-only page
  useEffect(() => {
    if (!isSessionValid(getSession())) {
      router.replace('/auth/login')
    }
  }, [router])

  if (!session) return null

  const memberSince = formatLocalDate(session.user.createdAtUTC, 'dd MMM yyyy')
  const sessionExpires = formatLocalDate(session.tokens.expiresAtUTC, 'dd MMM yyyy HH:mm')

  const logout = () => {
    signOut()
    router.push('/')
  }

  return (
    <div>
      <PageHero
        eyebrow="Account"
        title={`Welcome back, ${session.user.firstName}`}
        description="Manage your account."
        aside={(
          <Button
            variant="outline"
            className="shrink-0"
            onPress={logout}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        )}
      />

      <Container className="py-12">
        <div className="max-w-3xl space-y-6">
          <Card>
            <Card.Header>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-10 rounded-lg bg-sky-50 shrink-0">
                  <Building2 className="size-5 text-sky-600" />
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
                  <dt className="text-sm font-semibold text-slate-500 mb-1">
                    Name
                  </dt>

                  <dd className="text-slate-900">
                    {session.user.firstName}
                    {' '}
                    {session.user.lastName}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-semibold text-slate-500 mb-1">
                    Email
                  </dt>

                  <dd className="text-slate-900">
                    {session.user.email}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-semibold text-slate-500 mb-1">
                    Member since
                  </dt>

                  <dd className="text-slate-900">
                    {memberSince}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-semibold text-slate-500 mb-1">
                    Session expires
                  </dt>

                  <dd className="text-slate-900">
                    {sessionExpires}
                  </dd>
                </div>
              </dl>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content>
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex items-center justify-center size-14 rounded-full bg-slate-50">
                  <Workflow className="size-7 text-slate-400" />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    No documents yet
                  </h3>

                  <p className="text-slate-500 mt-1 max-w-md">
                    This is where you&apos;ll configure and monitor the AI nodevaultes orchestrating
                    work across your business. Coming soon.
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
      </Container>
    </div>
  )
}
