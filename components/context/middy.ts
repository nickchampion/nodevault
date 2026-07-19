import { normalizeError } from '@platform/components.nodevault.domain'
import type { EventHandler, ApiRouteHandler, IMiddleware, Middleware } from './types/index.js'
import { contextMiddleware } from './middleware/index.js'
import type { Context } from './index.js'

/**
 * Component to handle executing an API or Event handler and wrapping the call with any configured middleware components.
 * @param context
 * @param handler
 * @param rethrowError
 * @param middleware
 * @returns
 */
export const middy = async (
  context: Context,
  handler: ApiRouteHandler | EventHandler,
  middleware?: IMiddleware[],
): Promise<Context> => {
  let wrapper = configure(handler).use(contextMiddleware())

  // set up any middleware passed in by the service
  if (middleware) for (const m of middleware) {
    wrapper = wrapper.use(m)
  }

  // run the handler
  await wrapper(context)
  return context
}

const configure = (baseHandler: ApiRouteHandler | EventHandler) => {
  const before: Middleware[] = []
  const after: Middleware[] = []
  const error: Middleware[] = []

  const instance = async (context: Context) => {
    return await execute(context, before, baseHandler, after, error)
  }

  instance.use = (middleware: IMiddleware) => {
    const { before, after, error } = middleware

    if (!before && !after && !error) {
      throw new Error('Errors.Platform.InvalidMiddleware')
    }

    if (before) instance.before(before)

    if (after) instance.after(after)

    if (error) instance.error(error)

    return instance
  }

  // Inline Middlewares
  instance.before = (function_: Middleware) => {
    before.push(function_)
    return instance
  }
  instance.after = (function_: Middleware) => {
    after.unshift(function_)
    return instance
  }
  instance.error = (function_: Middleware) => {
    error.push(function_)
    return instance
  }

  return instance
}

const execute = async (
  context: Context,
  before: Middleware[],
  baseHandler: ApiRouteHandler | EventHandler,
  after: Middleware[],
  error: Middleware[],
) => {
  try {
    await run(context, before)
    await baseHandler(context)
    await run(context, after)
  } catch (error_) {
    try {
      context.error = error_
      await run(context, error)
    } catch (error_) {
      (error_ as { context?: Context }).context = context
      throw error_
    } finally {
      // set the response based on the error raised
      context.event.response.error(normalizeError(context.error))
    }
  }
}

const run = async (context: Context, functions: Middleware[]) => {
  for (const function_ of functions) {
    await function_(context)
  }
}
