export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
  ) {
    super(`HTTP ${status}: ${statusText}`)
    this.name = 'HttpError'
  }
}

export type RequestOptions = Omit<RequestInit, 'body' | 'method'> & {
  headers?: Record<string, string>
}

const parseBody = async (res: Response): Promise<unknown> => {
  const contentType = res.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) return res.json()

  return res.text()
}

export const createHttpClient = (baseUrl: string) => {
  const request = async <T>(method: string, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> => {
    const { headers: extraHeaders = {}, ...rest } = options

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      ...rest,
    })

    const data = await parseBody(res)

    if (!res.ok) throw new HttpError(res.status, res.statusText, data)

    return data as T
  }

  return {
    get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, body, options),
    put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, body, options),
    patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, body, options),
    delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, undefined, options),
  }
}
