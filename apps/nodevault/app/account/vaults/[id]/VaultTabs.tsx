'use client'

import { useRef, useState } from 'react'
import {
  Button, Card, Input, Label, Tabs, TextField,
} from '@heroui/react'
import { contentTypeForFileName, maxUploadBytes } from '@platform/components.contracts'
import { Link2, Upload } from 'lucide-react'
import type { FormEvent } from 'react'
import { api } from '../../../../lib/api'
import { FileList } from './FileList'

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

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    if (!file || uploading) return

    const contentType = contentTypeForFileName(file.name)

    if (!contentType || validate(file)) return

    setUploading(true)
    setError(null)

    try {
      const content = await readAsBase64(file)

      await api.files.upload.mutate({
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

const AddUrlForm = () => {
  const [url, setUrl] = useState('')

  // parse handler wired in a later change
  const submit = (event: FormEvent) => {
    event.preventDefault()
  }

  return (
    <form
      className="flex items-start gap-3 pb-4 mb-2 border-b border-slate-200 dark:border-slate-800"
      noValidate
      onSubmit={submit}
    >
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
        isDisabled={!url.trim()}
      >
        <Link2 className="size-4" />
        Parse URL
      </Button>
    </form>
  )
}

export const VaultTabs = ({ vaultId }: { vaultId: number }) => {
  const [uploadsVersion, setUploadsVersion] = useState(0)

  return (
    <Card>
      <Card.Content>
        <Tabs defaultSelectedKey="files">
          <Tabs.List aria-label="Vault contents">
            <Tabs.Tab id="files">
              Files
              <Tabs.Indicator />
            </Tabs.Tab>

            <Tabs.Tab id="urls">
              URLs
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel
            id="files"
            className="pt-4"
          >
            <UploadFileForm
              vaultId={vaultId}
              onUploaded={() => setUploadsVersion(version => version + 1)}
            />

            <FileList
              key={uploadsVersion}
              vaultId={vaultId}
              source="upload"
            />
          </Tabs.Panel>

          <Tabs.Panel
            id="urls"
            className="pt-4"
          >
            <AddUrlForm />

            <FileList
              vaultId={vaultId}
              source="url"
            />
          </Tabs.Panel>
        </Tabs>
      </Card.Content>
    </Card>
  )
}
