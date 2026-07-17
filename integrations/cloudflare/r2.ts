import { serverConfiguration } from '@platform/components.configuration'
import { AppError } from '@platform/components.domain'

export type PutObjectOptions = {
  key: string
  body: Uint8Array<ArrayBuffer>
  contentType?: string
}

export type R2Client = ReturnType<typeof createR2Client>

export const createR2Client = () => {
  const { accountId, apiKey, r2 } = serverConfiguration.cloudflare

  const objectUrl = (key: string) => `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${r2.bucket}/objects/${encodeURIComponent(key)}`

  const headers = (extra?: Record<string, string>) => ({
    authorization: `Bearer ${apiKey}`,
    ...extra,
  })

  return {
    get: async (key: string): Promise<Uint8Array<ArrayBuffer>> => {
      const response = await fetch(objectUrl(key), { headers: headers() })

      if (!response.ok) throw new AppError('internal', `R2 get failed [${response.status}]: ${key}`)

      return new Uint8Array(await response.arrayBuffer())
    },
    put: async ({ key, body, contentType }: PutObjectOptions) => {
      const response = await fetch(objectUrl(key), {
        method: 'PUT',
        headers: headers({ 'content-type': contentType ?? 'application/octet-stream' }),
        body,
      })

      if (!response.ok) throw new AppError('internal', `R2 upload failed [${response.status}]: ${key}`)
    },
    delete: async (key: string) => {
      const response = await fetch(objectUrl(key), {
        method: 'DELETE',
        headers: headers(),
      })

      if (!response.ok && response.status !== 404) {
        throw new AppError('internal', `R2 delete failed [${response.status}]: ${key}`)
      }
    },
  }
}
