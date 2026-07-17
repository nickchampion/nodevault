'use client'

import { useEffect, useState } from 'react'
import { Spinner } from '@heroui/react'
import { formatLocalDate } from '@platform/components.utils'
import { FileText, Link2 } from 'lucide-react'
import type { FileSource } from '@platform/components.contracts'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@platform/apps.api'
import { api } from '../../../../lib/api'
import { Pagination } from '../../../../components/ui/Pagination'

type ListFilesResponse = inferRouterOutputs<AppRouter>['files']['list']
type FileDto = ListFilesResponse['files'][number]

const PAGE_SIZE = 10

const statusStyles: Record<FileDto['status'], string> = {
  pending: 'bg-slate-500/10 text-slate-400',
  processing: 'bg-amber-500/10 text-amber-400',
  ready: 'bg-emerald-500/10 text-emerald-400',
  failed: 'bg-red-500/10 text-red-400',
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

export const FileList = ({ vaultId, source }: { vaultId: number, source: FileSource }) => {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListFilesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const load = async (silent = false) => {
      if (!silent) setLoading(true)

      try {
        const response = await api.files.list.query({
          vaultId, source, page, pageSize: PAGE_SIZE,
        })

        if (cancelled) return

        setData(response)
        setError(null)

        // refresh quietly while the processing workflow still has files in flight
        if (response.files.some(file => file.status === 'pending' || file.status === 'processing')) {
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
  }, [vaultId, source, page])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="sm" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-red-400 py-4 text-center">
        {error}
      </p>
    )
  }

  if (!data || data.total === 0) {
    return (
      <p className="text-slate-400 py-4 text-center">
        {source === 'upload'
          ? 'No files yet — upload your first one above.'
          : 'No URLs yet — add your first one above.'}
      </p>
    )
  }

  return (
    <div>
      <ul className="divide-y divide-slate-800">
        {data.files.map(file => (
          <li
            key={file.id}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              {source === 'upload'
                ? <FileText className="size-4 text-slate-400 shrink-0" />
                : <Link2 className="size-4 text-slate-400 shrink-0" />}

              <div className="min-w-0">
                <p className="text-slate-100 font-medium truncate">
                  {file.name ?? file.url ?? 'Untitled'}
                </p>

                <p className="text-sm text-slate-400 truncate">
                  {[
                    source === 'url' ? file.url : null,
                    source === 'upload' && file.sizeBytes !== null ? formatBytes(file.sizeBytes) : null,
                    `Added ${formatLocalDate(file.createdAtUTC, 'dd MMM yyyy')}`,
                  ].filter(Boolean).join(' · ')}
                </p>

                {file.status === 'failed' && file.error && (
                  <p className="text-sm text-red-400 truncate">
                    {file.error}
                  </p>
                )}
              </div>
            </div>

            <span
              className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${statusStyles[file.status]}`}
              title={file.error ?? undefined}
            >
              {file.status}
            </span>
          </li>
        ))}
      </ul>

      {data.total > data.pageSize && (
        <div className="flex justify-center pt-4 mt-2 border-t border-slate-800">
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onChange={setPage}
          />
        </div>
      )}
    </div>
  )
}
