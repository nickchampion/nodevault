'use client'

import { useState } from 'react'
import { Button, Spinner } from '@heroui/react'
import {
  Download, ExternalLink, FileText, Link2,
} from 'lucide-react'
import { api } from '../../lib/api'

type AssetResultCardProperties = {
  vaultId: number
  assetId: number
  assetName: string | null
  assetUrl: string | null
  source: 'file' | 'url'
  chunkIndex?: number | null
  text?: string | null
  relevance?: number | null
  ordinal?: number | null
  variant?: 'full' | 'compact'
}

const downloadAsset = async (vaultId: number, assetId: number) => {
  const { name, contentType, content } = await api.assets.download.query({ vaultId, assetId })

  const bytes = Uint8Array.from(atob(content), char => char.charCodeAt(0))
  const blob = new Blob([bytes], { type: contentType ?? 'application/octet-stream' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')

  link.href = url
  link.download = name
  link.click()

  URL.revokeObjectURL(url)
}

/**
 * One asset presentation shared by the search results list (variant="full": relevance
 * and a text snippet, with download/open affordances) and the Q&A citation chips
 * (variant="compact": a pill with the citation ordinal). Both render the same source
 * icon, name and open-in-new-tab / download controls so search and Ask read as one UI.
 */
export const AssetResultCard = ({
  vaultId, assetId, assetName, assetUrl, source,
  text, relevance, ordinal, variant = 'full',
}: AssetResultCardProperties) => {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const download = async () => {
    setDownloading(true)
    setDownloadError(null)

    try {
      await downloadAsset(vaultId, assetId)
    } catch (error) {
      setDownloadError((error as Error).message || 'Failed to download the file')
    } finally {
      setDownloading(false)
    }
  }

  const label = assetName ?? assetUrl ?? 'Untitled'

  if (variant === 'compact') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300">
        {ordinal != null && (
          <span className="font-medium">
            [
            {ordinal}
            ]
          </span>
        )}

        {source === 'file'
          ? <FileText className="size-3.5 shrink-0" />
          : <Link2 className="size-3.5 shrink-0" />}

        <span className="max-w-48 truncate">
          {label}
        </span>

        {source === 'url' && assetUrl && (
          <a
            href={assetUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open source in a new tab"
            className="hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </span>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        {source === 'file'
          ? <FileText className="size-4 text-slate-500 dark:text-slate-400 shrink-0" />
          : <Link2 className="size-4 text-slate-500 dark:text-slate-400 shrink-0" />}

        <p className="text-slate-900 dark:text-slate-100 font-medium truncate">
          {label}
        </p>

        {relevance != null && (
          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 ml-auto">
            {Math.round(relevance * 100)}
            % relevance
          </span>
        )}

        {source === 'url' && assetUrl && (
          <a
            href={assetUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open in a new tab"
            className={`shrink-0 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200${relevance == null ? ' ml-auto' : ''}`}
          >
            <ExternalLink className="size-4" />
          </a>
        )}

        {source === 'file' && (
          <Button
            variant="ghost"
            isIconOnly
            aria-label="Download file"
            isDisabled={downloading}
            onPress={() => void download()}
            className={`shrink-0${relevance == null ? ' ml-auto' : ''}`}
          >
            {downloading
              ? <Spinner size="sm" />
              : <Download className="size-4" />}
          </Button>
        )}
      </div>

      {text && (
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
          {text}
        </p>
      )}

      {downloadError && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
          {downloadError}
        </p>
      )}
    </div>
  )
}
