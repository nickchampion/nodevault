import { cache } from '@platform/components.cache'
import { serverConfiguration } from '@platform/components.configuration.server'
import type { ApiHandler } from '@platform/components.context'
import type { OpenRouterModelsResponse } from '@platform/components.nodevault.contracts'
import { listOpenRouterModels } from '@platform/integrations.openrouter'

const CACHE_KEY = 'openrouter:models'

export const accountOpenRouterModels: ApiHandler<void, OpenRouterModelsResponse> = async (context) => {
  if (!context.user?.accountId) return context.event.response.unauthorised()

  const models = await cache.get(
    CACHE_KEY,
    () => listOpenRouterModels(),
    serverConfiguration.cache.timeouts.tenMinutes,
  )

  return context.event.response.ok({ models: models ?? [] })
}
