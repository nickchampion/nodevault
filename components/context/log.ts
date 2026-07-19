import { AppError } from '@platform/components.nodevault.domain'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export type LogFields = Record<string, unknown>

/**
 * Minimal structured logger. Writes JSON to console.* so Cloudflare Workers Logs
 * (and `wrangler tail`) pick up the level and the structured fields.
 *
 * Use `with(...)` to attach request-scoped fields (requestId, path, userId)
 * once at the boundary; every subsequent log call carries them automatically.
 */
export class Log {
  private readonly minLevel: number
  private readonly base: LogFields

  constructor(level: LogLevel = 'info', base: LogFields = {}) {
    this.minLevel = LEVEL_ORDER[level]
    this.base = base
  }

  /** Return a child logger that includes `fields` on every entry. */
  with(fields: LogFields): Log {
    const child = new Log('debug', { ...this.base, ...fields })

    // preserve parent's level threshold without exposing it as ctor arg
    ;(child as any).minLevel = this.minLevel
    return child
  }

  debug(message: string, fields?: LogFields) {
    this.emit('debug', message, undefined, fields)
  }

  info(message: string, fields?: LogFields) {
    this.emit('info', message, undefined, fields)
  }

  /**
   * Warn about a recoverable problem. Pass an error as the second arg
   * (e.g. for 4xx client errors) and it'll be serialized properly.
   */
  warn(message: string, error?: unknown, fields?: LogFields) {
    this.emit('warn', message, error, fields)
  }

  /**
   * Log an error without failing the request. Pass either a message+error,
   * or just an error/AppError (its message is used).
   */
  error(messageOrError: string | unknown, errorOrFields?: unknown, fields?: LogFields) {
    const [message, error, extra] = typeof messageOrError === 'string'
      ? [messageOrError, errorOrFields, fields]
      : [extractMessage(messageOrError), messageOrError, errorOrFields as LogFields | undefined]

    this.emit('error', message, error, extra)
  }

  private emit(level: LogLevel, message: string, error: unknown, fields?: LogFields) {
    const serialized = serializeError(error)

    this.write(level, message, serialized ? { ...fields, error: serialized } : fields)
  }

  private write(level: LogLevel, message: string, fields?: LogFields) {
    if (LEVEL_ORDER[level] < this.minLevel) return

    const entry = {
      level,
      time: new Date().toISOString(),
      message,
      ...this.base,
      ...fields,
    }

    // Workers Logs maps console.* → log levels; passing the object keeps it structured.
    const function_ = level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'debug' ? console.debug : console.log

    function_(entry)
  }
}

const extractMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message

  if (typeof error === 'string') return error

  return 'Unknown error'
}

const serializeError = (error: unknown): LogFields | undefined => {
  if (error === undefined || error === null) return undefined

  if (error instanceof AppError) {
    return {
      name: error.name,
      kind: error.kind,
      statusCode: error.statusCode,
      message: error.message,
      stack: error.stack,
      details: error.details,
      cause: serializeError(error.cause),
    }
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: serializeError((error as { cause?: unknown }).cause),
    }
  }

  return { value: error }
}
