'use client'

import { useRef, useState } from 'react'
import {
  Button, Card, Input, Label, Tabs, TextField,
} from '@heroui/react'
import { contentTypeForFileName, maxUploadBytes } from '@platform/components.nodevault.contracts'
import { Link2, Upload } from 'lucide-react'
import type { SubmitEvent } from 'react'
import { api } from '../../../../lib/api'
import { AssetList } from './AssetList'

const readAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()

  // result is a data URL (data:<type>;base64,<content>) — strip the prefix
  reader.addEventListener('load', () => resolve((reader.result as string).split(',', 2)[1]), { capture: false })
  reader.addEventListener('error', () => reject(reader.error ?? new Error('Failed to read the file')), { capture: false })
  reader.readAsDataURL(file)
})

const UploadFileForm = ({ vaultId, onUploaded }: { vaultId: number, onUploaded: () => void }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = (selected: File | null) => {
    if (!selected) return null

    if (!contentTypeForFileName(selected.name)) return 'Unsupported file type — supported: .txt, .md, .pdf, .docx'

    if (selected.size > maxUploadBytes) return 'File must be 10MB or smaller'

    return null
  }

  const select = (selected: File | null) => {
    setError(validate(selected))
    setFile(selected)
  }

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()

    if (!file || uploading) return

    const contentType = contentTypeForFileName(file.name)

    if (!contentType || validate(file)) return

    setUploading(true)
    setError(null)

    try {
      const content = await readAsBase64(file)

      await api.assets.upload.mutate({
        vaultId,
        name: file.name,
        contentType,
        content,
      })

      setFile(null)

      if (inputRef.current) inputRef.current.value = ''

      onUploaded()
    } catch (error_) {
      setError((error_ as Error).message || 'Failed to upload the file')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form
      className="pb-4 mb-2 border-b border-slate-200 dark:border-slate-800"
      onSubmit={submit}
    >
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,.markdown,.pdf,.docx"
          className="hidden"
          onChange={event => select(event.target.files?.[0] ?? null)}
        />

        <Button
          variant="secondary"
          isDisabled={uploading}
          onPress={() => inputRef.current?.click()}
        >
          <Upload className="size-4" />
          Choose file
        </Button>

        <span className="text-sm text-slate-500 dark:text-slate-400 flex-1 truncate">
          {file ? file.name : 'No file selected'}
        </span>

        <Button
          type="submit"
          isDisabled={!file || uploading || validate(file) !== null}
          isPending={uploading}
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
          {error}
        </p>
      )}
    </form>
  )
}

const AddUrlForm = ({ vaultId, onSubmitted }: { vaultId: number, onSubmitted: () => void }) => {
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()

    if (!url.trim() || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      await api.assets.submitUrl.mutate({ vaultId, url: url.trim() })

      setUrl('')
      onSubmitted()
    } catch (error_) {
      setError((error_ as Error).message || 'Failed to submit the URL')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="pb-4 mb-2 border-b border-slate-200 dark:border-slate-800"
      noValidate
      onSubmit={submit}
    >
      <div className="flex items-start gap-3">
        <TextField
          value={url}
          onChange={setUrl}
          className="flex-1"
          aria-label="URL to parse"
        >
          <Label className="sr-only">URL to parse</Label>

          <Input placeholder="https://example.com/page" />
        </TextField>

        <Button
          type="submit"
          isDisabled={!url.trim() || submitting}
          isPending={submitting}
        >
          <Link2 className="size-4" />
          {submitting ? 'Submitting…' : 'Parse URL'}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
          {error}
        </p>
      )}
    </form>
  )
}

export const VaultTabs = ({ vaultId, onAssetChangeAction }: { vaultId: number, onAssetChangeAction: () => void }) => {
  const [uploadsVersion, setUploadsVersion] = useState(0)
  const [urlsVersion, setUrlsVersion] = useState(0)

  return (
    <Card>
      <Card.Content>
        <Tabs defaultSelectedKey="upload">
          <Tabs.List aria-label="Vault contents">
            <Tabs.Tab id="upload">
              Vault files
              <Tabs.Indicator />
            </Tabs.Tab>

            <Tabs.Tab id="import-url">
              Vault URLs
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel
            id="upload"
            className="pt-4"
          >
            <UploadFileForm
              vaultId={vaultId}
              onUploaded={() => {
                setUploadsVersion(version => version + 1)
                onAssetChangeAction()
              }}
            />

            <AssetList
              key={uploadsVersion}
              vaultId={vaultId}
              source="file"
            />
          </Tabs.Panel>

          <Tabs.Panel
            id="import-url"
            className="pt-4"
          >
            <AddUrlForm
              vaultId={vaultId}
              onSubmitted={() => {
                setUrlsVersion(version => version + 1)
                onAssetChangeAction()
              }}
            />

            <AssetList
              key={urlsVersion}
              vaultId={vaultId}
              source="url"
            />
          </Tabs.Panel>
        </Tabs>
      </Card.Content>
    </Card>
  )
}
