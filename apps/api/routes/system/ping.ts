import type { ApiHandler } from '@platform/components.context'
import type { PingResponse } from '@platform/components.nodevault.contracts'

export const systemPing: ApiHandler<unknown, PingResponse> = async (context) => {
  return context.event.response.ok({ status: 'ok' })
}
