import type { Context } from '../context.js'
import type { Response, ResponseValue } from '../../api/types/response.js'

/**
 * Signature for API handlers. Declare the payload and success body from the contract
 * types, e.g. `ApiHandler<LoginRequest, OkResponse>` — the payload is then typed on
 * `context.event.payload`, response builders check their argument against TBody, and
 * `execute()` carries both through to the tRPC procedure so the router's input/output
 * schemas verify them at compile time.
 */
export type ApiHandler<TPayload = unknown, TBody extends ResponseValue = ResponseValue> = (context: Context<TPayload, TBody>) => Promise<Response<TBody>>

/**
 * Type-erased API handler signature used by infrastructure (middy) that runs any handler
 */
export type ApiRouteHandler = ApiHandler<any, any>

/**
 * Signature for event handlers
 */
export type EventHandler = (context: Context) => Promise<void>

/**
 * Signature for a middleware function
 */
export type Middleware = (context: Context) => Promise<void>

/**
 * Interface for middleware components
 */
export interface IMiddleware {
  before?: Middleware
  after?: Middleware
  error?: Middleware
}
