/**
 * A single field-level validation failure returned to clients.
 */
export type ValidationError = {
  path: string
  message: string
  data?: unknown
}

/**
 * Standard envelope for non-2xx responses built by the Response class.
 */
export type StandardResponse = {
  status: string
  message: string
  validation?: ValidationError[]
  stack?: string
  code?: string
  body?: unknown
}
