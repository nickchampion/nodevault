import type { ServerResponse } from 'node:http'
import type { AskStreamEvent } from '@platform/components.nodevault.contracts'

export type SseWriter = {
  send: (event: AskStreamEvent) => void
  end: () => void
}

export const createSseWriter = (res: ServerResponse): SseWriter => ({
  send: (event) => {
    if (res.writableEnded) return

    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
  },

  end: () => {
    if (!res.writableEnded) res.end()
  },
})
