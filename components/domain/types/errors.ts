export type ErrorKind = 'internal' | 'auth' | 'forbidden' | 'validation' | 'not-found' | 'conflict'

const STATUS_BY_KIND: Record<ErrorKind, number> = {
  internal: 500,
  auth: 401,
  forbidden: 403,
  validation: 400,
  'not-found': 404,
  conflict: 409,
}

/**
 * Application error carrying a kind (used to derive the HTTP status code) and optional
 * structured details. All errors leaving a handler are normalised to this shape so the
 * response builder, logger and session error hooks can rely on it.
 */
export class AppError extends Error {
  public kind: ErrorKind
  public statusCode: number
  public details?: unknown

  constructor(kind: ErrorKind, message: string, statusCode?: number, stack?: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.kind = kind
    this.statusCode = statusCode ?? STATUS_BY_KIND[kind]
    this.details = details

    if (stack) this.stack = stack
  }
}

export class AuthError extends AppError {
  constructor(message = 'You are not authorised to access this resource') {
    super('auth', message)
    this.name = 'AuthError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource') {
    super('forbidden', message)
    this.name = 'ForbiddenError'
  }
}

/**
 * Normalise any thrown value to an AppError so downstream code can stop type-sniffing.
 */
export const normalizeError = (error: unknown): AppError => {
  if (error instanceof AppError) return error

  if (error instanceof Error) {
    const normalized = new AppError('internal', error.message, 500, error.stack)

    // keep the original name so callers can still identify the error type
    normalized.name = error.name
    normalized.cause = error.cause
    return normalized
  }

  return new AppError('internal', typeof error === 'string' ? error : 'Unknown error')
}
