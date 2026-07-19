import { QuerySettings, QuerySettingsSortBy } from '@platform/components.nodevault.domain'
import { Response, type ResponseValue } from '../../api/types/response.js'
import type { AuthTokens } from './auth.js'

export type InboundEventType = 'http' | 'event'

export interface FileUpload {
  size: number
  filename: string | null
  mimetype: string | null
  buffer: Buffer
}

/**
 * Representation of an event that triggered whatever code is currently executing
 * Can be an API request or an event
 *
 * TPayload/TBody are the request payload and success response body types a typed
 * ApiHandler declares; they default to unknown/ResponseValue for untyped contexts
 * (event handlers, infrastructure).
 */
export class InboundEvent<TPayload = unknown, TBody extends ResponseValue = ResponseValue> {
  public operation: string | undefined
  public path: string | undefined

  // assigned by the transport (execute() for tRPC) before a typed handler runs
  public payload!: TPayload
  public pathAndQuery: string | undefined
  public query: Record<string, any> = {}
  public params: Record<string, string | string[]> = {}
  public method: string = 'GET'
  public headers: Record<string, string> = {}
  public response: Response<TBody>
  public type: InboundEventType = 'http'
  public version: string | undefined
  public clientVersion: string | undefined
  public body: string | undefined // the raw request body, used for cryptographic verification of request bodies
  public files?: Record<string, FileUpload> // set of files uploaded with this request

  constructor(fields?: Partial<InboundEvent<TPayload, TBody>>) {
    Object.assign(this, fields)
    this.response = new Response<TBody>(this.headers)
  }

  public id(): string {
    const payload = this.payload as { id?: string } | undefined

    return (this.params.id as string) || this.query.id || (payload ? (payload.id as string) : null)
  }

  /**
   * Read paging/sort/filter settings from the inbound query string.
   *
   * The optional `defaults` shallow-merges over the standard defaults; `applyFilters` switches on
   * extracting `f:`-prefixed query params into `settings.filters` so callers can run a fully
   * configured search without parsing the URL themselves.
   */
  public getQuerySettings(defaults?: Partial<QuerySettings>, applyFilters: boolean = false): QuerySettings {
    const limit = Number.parseInt(this.query.limit, 10)
    const offset = Number.parseInt(this.query.offset, 10)

    const settings = new QuerySettings({
      limit: Number.isFinite(limit) ? limit : defaults?.limit ?? 25,
      offset: Number.isFinite(offset) ? offset : defaults?.offset ?? 0,
      sortDesc: this.query.sortDesc === 'true' || defaults?.sortDesc === true,
      count: this.query.count === 'true' || defaults?.count === true,
      startDateISO: this.query.startDateISO ?? defaults?.startDateISO ?? null,
      endDateISO: this.query.endDateISO ?? defaults?.endDateISO ?? null,
    })

    if (this.query.sortBy) {
      const fields = Array.isArray(this.query.sortBy) ? this.query.sortBy : [this.query.sortBy]

      settings.sortBy = fields.map((field: string) => {
        const [fieldName, direction] = field.split(':')

        return new QuerySettingsSortBy({ fieldName, sortDesc: direction === 'desc' })
      })
    } else if (defaults?.sortBy) {
      settings.sortBy = defaults.sortBy
    }

    if (applyFilters) {
      settings.filters = Object.keys(this.query)
        .filter(k => k.startsWith('f:'))
        .reduce<Record<string, string | string[]>>((accumulator, k) => {
          accumulator[k.slice(2)] = this.query[k]
          return accumulator
        }, {})
    }

    return settings
  }

  public getAuthToken(): string | null {
    return InboundEvent.getAuthToken(this.headers)
  }

  public setAuthTokens(tokens: AuthTokens): void {
    this.headers['authorization'] = `Bearer ${tokens.access}`
  }

  static getAuthToken(headers: Record<string, string | string[]>): string | null {
    const auth = headers['authorization'] || headers['Authorization']

    const handleNull = (header: string) => {
      if (header && header.trim().startsWith('null')) return null

      return header
    }

    return auth ? handleNull(auth.toString().replace('Bearer ', '')) : null
  }
}
