'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Alert, Spinner } from '@heroui/react'
import { formatLocalDate } from '@platform/components.utils'
import {
  ArrowLeft, CalendarDays, FileText, Link2,
} from 'lucide-react'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@platform/apps.api'
import { getSession, isSessionValid, useAuth } from '../../../../lib/auth'
import { api } from '../../../../lib/api'
import { PageHero } from '../../../../components/app/PageHero'
import { Container } from '../../../../components/ui/Container'
import { VaultTabs } from './VaultTabs'

type VaultDto = inferRouterOutputs<AppRouter>['vaults']['get']

export const VaultView = ({ vaultId }: { vaultId: number }) => {
  const router = useRouter()
  const { session } = useAuth()
  const [vault, setVault] = useState<VaultDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // authenticated-only page; vaults stay locked until the account's GCP project is connected
  useEffect(() => {
    const current = getSession()

    if (!isSessionValid(current)) {
      router.replace('/auth/login')
    } else if (!current?.account.gcpConfigured) {
      router.replace('/account/settings')
    }
  }, [router])

  const refreshVault = async () => {
    try {
      const response = await api.vaults.get.query({ vaultId })

      setVault(response)
    } catch (error_) {
      setError((error_ as Error).message || 'Failed to load the vault')
    }
  }

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await api.vaults.get.query({ vaultId })

        if (!cancelled) setVault(response)
      } catch (error_) {
        if (!cancelled) setError((error_ as Error).message || 'Failed to load the vault')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [vaultId])

  if (!session) return null

  return (
    <div>
      <PageHero
        eyebrow="Vault"
        title={vault?.name ?? 'Vault'}
        description="Browse the documents and web pages in this vault."
      />

      <Container className="py-12">
        <div className="space-y-6">
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to account home
          </Link>

          {loading && (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          )}

          {error && (
            <Alert status="danger">
              <Alert.Indicator />

              <Alert.Content>
                <Alert.Title>Something went wrong</Alert.Title>

                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          {vault && (
            <>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
                  <dt className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Name
                  </dt>

                  <dd className="text-slate-900 dark:text-slate-100 font-medium truncate">
                    {vault.name}
                  </dd>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
                  <dt className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Created
                  </dt>

                  <dd className="text-slate-900 dark:text-slate-100 font-medium flex items-center gap-1.5">
                    <CalendarDays className="size-4 text-slate-500 dark:text-slate-400" />
                    {formatLocalDate(vault.createdAtUTC, 'dd MMM yyyy')}
                  </dd>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
                  <dt className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Files
                  </dt>

                  <dd className="text-slate-900 dark:text-slate-100 font-medium flex items-center gap-1.5">
                    <FileText className="size-4 text-slate-500 dark:text-slate-400" />
                    {vault.documentCount}
                  </dd>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
                  <dt className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    URLs
                  </dt>

                  <dd className="text-slate-900 dark:text-slate-100 font-medium flex items-center gap-1.5">
                    <Link2 className="size-4 text-slate-500 dark:text-slate-400" />
                    {vault.urlCount}
                  </dd>
                </div>
              </dl>

              <VaultTabs vaultId={vault.id} onAssetChangeAction={refreshVault} />
            </>
          )}
        </div>
      </Container>
    </div>
  )
}
