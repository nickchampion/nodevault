import { TRPCError, initTRPC, type TRPC_ERROR_CODE_KEY } from '@trpc/server'
import { middy, type ApiHandler, type Context } from '@platform/components.context'
import { isExpired } from '@platform/components.utils'
import type { ResponseValue, StandardResponse, ValidationError } from './types/index.js'

/**
 * tRPC error that carries the StandardResponse envelope built by a handler so the error
 * formatter can surface the same response shape (validation errors etc.) clients received
 * from the previous REST API.
 */
export class ApiResponseError extends TRPCError {
  public response: StandardResponse

  constructor(code: TRPC_ERROR_CODE_KEY, response: StandardResponse, cause?: unknown) {
    super({ code, message: response.message, cause: cause instanceof Error ? cause : undefined })
    this.response = response
  }
}

const isZodLikeCause = (cause: unknown): cause is { issues: { path: (string | number)[], message: string }[] } => typeof cause === 'object' && cause !== null && Array.isArray((cause as { issues?: unknown }).issues)

/**
 * tRPC instance bound to our Context. The error formatter attaches the standard
 * validation shape to error responses, both for handler-raised errors and zod input
 * parse failures, so clients get a consistent envelope.
 */
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    let validation: ValidationError[] | undefined
    let code: string | undefined
    let message = shape.message

    if (error instanceof ApiResponseError) {
      validation = error.response.validation
      code = error.response.code
    } else if (error.code === 'BAD_REQUEST' && isZodLikeCause(error.cause)) {
      validation = error.cause.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
      code = 'ValidationError'
      // the default message for input parse failures is the stringified zod error
      message = 'One or more validation errors have occurred'
    }

    return {
      ...shape,
      message,
      data: {
        ...shape.data,
        code: code ?? shape.data.code,
        validation,
      },
    }
  },
})

export const router = t.router
export const mergeRouters = t.mergeRouters

const CODE_BY_STATUS: Record<number, TRPC_ERROR_CODE_KEY> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
}

/**
 * Guard middleware mirroring the JWT security scheme from the OpenAPI days: the request
 * must carry a valid, unexpired token, and when roles are given the user must hold at
 * least one of them.
 */
const requireAuth = (roles: string[] = []) => t.middleware(({ ctx, next }) => {
  const token = ctx.event.getAuthToken()

  if (!token || !ctx.user || isExpired(ctx.user.expiresAtUTC)) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  if (roles.length > 0 && ctx.user.roles.every(role => !roles.includes(role))) {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }

  ctx.authorised = true

  return next()
})

/** Procedure with no auth requirements. */
export const publicProcedure = t.procedure

/** Procedure requiring a valid, unexpired auth token. */
export const protectedProcedure = t.procedure.use(requireAuth())

/** Procedure requiring a valid token whose user holds one of the given roles. */
export const roleProcedure = (...roles: string[]) => t.procedure.use(requireAuth(roles))

/**
 * Bridge an ApiHandler onto a tRPC procedure resolver. This preserves the existing
 * handler pattern and request lifecycle:
 *
 * - the validated procedure input becomes `context.event.payload`
 * - the handler runs through middy (context middleware: transaction open/commit,
 *   logging, error handling)
 * - the Response built by the handler is unwrapped: 2xx returns the body, anything else
 *   becomes a TRPCError carrying the standard response envelope
 *
 * TIn/TOut are inferred from the handler's ApiHandler<TIn, TOut> declaration and typed
 * onto the returned resolver, so the procedure's `.input()`/`.output()` schemas verify
 * the handler's declared contract at the wiring site.
 *
 * Usage: `publicProcedure.input(schema).output(schema).mutation(execute(authLogin))`
 */
export const execute = <TIn, TOut extends ResponseValue>(handler: ApiHandler<TIn, TOut>) => async ({ ctx: resolverContext, input }: { ctx: unknown, input: TIn }): Promise<TOut> => {
  // tRPC's resolver options expose a structurally-mapped view of the context which
  // drops private class fields; the runtime object is the Context built in createContext
  const context = resolverContext as Context<TIn, TOut>

  context.event.payload = input

  await middy(context, handler)

  return resolveResponse(context) as TOut
}

/**
 * Unwrap the Response a handler produced: return the body for 2xx, throw a TRPCError
 * carrying the standard envelope otherwise.
 */
const resolveResponse = (context: Context): unknown => {
  const response = context.event.response

  if (response.statusCode < 400) return response.body

  const body = (response.body ?? {
    status: 'error',
    message: 'Request failed',
  }) as StandardResponse

  throw new ApiResponseError(CODE_BY_STATUS[response.statusCode] ?? 'INTERNAL_SERVER_ERROR', body, context.error)
}
