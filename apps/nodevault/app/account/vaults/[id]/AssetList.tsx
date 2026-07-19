'use client'

import { useEffect, useState } from 'react'
import { Button, Spinner } from '@heroui/react'
import { formatLocalDate } from '@platform/components.utils'
import { FileText, Link2, Trash2 } from 'lucide-react'
import type { AssetSource } from '@platform/components.nodevault.contracts'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@platform/apps.api'
import { api } from '../../../../lib/api'
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog'
import { Pagination } from '../../../../components/ui/Pagination'

type ListAssetsResponse = inferRouterOutputs<AppRouter>['assets']['list']
type AssetDto = ListAssetsResponse['assets'][number]

const PAGE_SIZE = 10

const statusStyles: Record<AssetDto['status'], string> = {
  pending: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  processing: 'bg-sky-400/10 text-sky-600 dark:text-sky-300',
  ready: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  failed: 'bg-red-500/10 text-red-700 dark:text-red-400',
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB']
  let value = bytes

  for (const unit of units) {
    value /= 1024

    if (value < 1024 || unit === 'GB') return `${value.toFixed(1)} ${unit}`
  }

  return `${bytes} B`
}

export const AssetList = ({ vaultId, source }: { vaultId: number, source: AssetSource }) => {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListAssetsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<AssetDto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const load = async (silent = false) => {
      if (!silent) setLoading(true)

      try {
        const response = await api.assets.list.query({
          vaultId, source, page, pageSize: PAGE_SIZE,
        })

        if (cancelled) return

        setData(response)
        setError(null)

        // refresh quietly while the processing workflow still has assets in flight
        if (response.assets.some(asset => asset.status === 'pending' || asset.status === 'processing')) {
          timer = setTimeout(() => void load(true), 2500)
        }
      } catch (error_) {
        if (!cancelled) setError((error_ as Error).message || 'Failed to load the list')
      } finally {
        if (!cancelled && !silent) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true

      if (timer) clearTimeout(timer)
    }
  }, [vaultId, source, page, reloadVersion])

  const confirmDelete = async () => {
    if (!pendingDelete) return

    setDeleting(true)
    setDeleteError(null)

    try {
      await api.assets.delete.mutate({ vaultId, assetId: pendingDelete.id })
      setPendingDelete(null)
      setReloadVersion(version => version + 1)
    } catch (error_) {
      setDeleteError((error_ as Error).message || 'Failed to delete the asset')
    } finally {
      setDeleting(false)
    }
  }

  const confirmDialog = (
    <ConfirmDialog
      isOpen={pendingDelete !== null}
      title="Delete asset?"
      description={`This will permanently delete "${pendingDelete?.name ?? pendingDelete?.url ?? 'this asset'}" and all of its indexed content. This cannot be undone.`}
      confirmLabel="Delete"
      isConfirming={deleting}
      onOpenChangeAction={isOpen => !isOpen && setPendingDelete(null)}
      onConfirmAction={() => void confirmDelete()}
    />
  )

  if (loading) {
    return (
      <>
        {confirmDialog}

        <div className="flex justify-center py-8">
          <Spinner size="sm" />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        {confirmDialog}

        <p className="text-red-600 dark:text-red-400 py-4 text-center">
          {error}
        </p>
      </>
    )
  }

  if (!data || data.total === 0) {
    return (
      <>
        {confirmDialog}

        <p className="text-slate-500 dark:text-slate-400 py-4 text-center">
          {source === 'file'
            ? 'No files yet — upload your first one above.'
            : 'No URLs yet — add your first one above.'}
        </p>
      </>
    )
  }

  return (
    <div>
      {confirmDialog}

      {deleteError && (
        <p className="text-sm text-red-600 dark:text-red-400 pb-3">
          {deleteError}
        </p>
      )}

      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {data.assets.map(asset => (
          <li
            key={asset.id}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              {source === 'file'
                ? <FileText className="size-4 text-slate-500 dark:text-slate-400 shrink-0" />
                : <Link2 className="size-4 text-slate-500 dark:text-slate-400 shrink-0" />}

              <div className="min-w-0">
                <p className="text-slate-900 dark:text-slate-100 font-medium truncate">
                  {asset.name ?? asset.url ?? 'Untitled'}
                </p>

                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                  {[
                    source === 'url' ? asset.url : null,
                    source === 'file' && asset.sizeBytes !== null ? formatBytes(asset.sizeBytes) : null,
                    `Added ${formatLocalDate(asset.createdAtUTC, 'dd MMM yyyy')}`,
                  ].filter(Boolean).join(' · ')}
                </p>

                {asset.status === 'failed' && asset.error && (
                  <p className="text-sm text-red-600 dark:text-red-400 truncate">
                    {asset.error}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyles[asset.status]}`}
                title={asset.error ?? undefined}
              >
                {asset.status}
              </span>

              <Button
                variant="ghost"
                isIconOnly
                aria-label="Delete asset"
                isDisabled={pendingDelete !== null}
                onPress={() => setPendingDelete(asset)}
              >
                <Trash2 className="size-4 text-red-600 dark:text-red-400" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {data.total > data.pageSize && (
        <div className="flex justify-center pt-4 mt-2 border-t border-slate-200 dark:border-slate-800">
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onChangeAction={setPage}
          />
        </div>
      )}
    </div>
  )
}
