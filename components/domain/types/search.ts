export class QuerySettingsSortBy {
  fieldName!: string
  sortDesc: boolean = false

  constructor(fields?: Partial<QuerySettingsSortBy>) {
    Object.assign(this, fields ?? {})
  }
}

/**
 * Paging, sorting and filtering settings extracted from an inbound query string.
 */
export class QuerySettings {
  limit: number = 25
  offset: number = 0
  sortDesc: boolean = false
  count: boolean = false
  startDateISO: string | null = null
  endDateISO: string | null = null
  sortBy: QuerySettingsSortBy[] = []
  filters: Record<string, string | string[]> = {}

  constructor(fields?: Partial<QuerySettings>) {
    Object.assign(this, fields ?? {})
  }
}
