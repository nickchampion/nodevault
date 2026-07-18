'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@heroui/react'
import { formatLocalDate } from '@platform/components.utils'
import { Building2, Pencil } from 'lucide-react'
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

  const memberSince = formatLocalDate(session.user.createdAtUTC, 'dd MMM yyyy')

  return (
    <div>
      <PageHero
        eyebrow="Account"
        title={`Welcome back, ${session.user.firstName}`}
        description="Manage your account."
      />

      <Container className="py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <Card className="lg:col-span-1">
            <Card.Header>
              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-10 rounded-lg bg-sky-500/10 shrink-0">
                    <Building2 className="size-5 text-sky-600 dark:text-sky-400" />
                  </div>

                  <div>
                    <Card.Title>
                      {session.account.name}
                    </Card.Title>

                    <Card.Description>
                      Your profile
                    </Card.Description>
                  </div>
                </div>

                <LinkButton
                  href="/account/edit"
                  variant="secondary"
                  size="sm"
                >
                  <Pencil className="size-4" />
                  <span className="sr-only">Edit profile</span>
                </LinkButton>
              </div>
            </Card.Header>

            <Card.Content>
              <dl className="grid grid-cols-1 gap-y-5">
                <div>
                  <dt className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Name
                  </dt>

                  <dd className="text-slate-900 dark:text-slate-100">
                    {session.user.firstName}
                    {' '}
                    {session.user.lastName}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Email
                  </dt>

                  <dd className="text-slate-900 dark:text-slate-100">
                    {session.user.email}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Phone
                  </dt>

                  <dd className="text-slate-900 dark:text-slate-100">
                    {session.user.phone
                      ? `${session.user.phone.countryCode} ${session.user.phone.number}`
                      : 'Not set'}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Member since
                  </dt>

                  <dd className="text-slate-900 dark:text-slate-100">
                    {memberSince}
                  </dd>
                </div>
              </dl>
            </Card.Content>
          </Card>

          <div className="lg:col-span-3">
            <VaultsCard />
          </div>
        </div>
      </Container>
    </div>
  )
}
