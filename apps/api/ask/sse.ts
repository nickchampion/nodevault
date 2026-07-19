import type { ServerResponse } from 'node:http'
import type { AskStreamEvent } from '@platform/components.contracts'

export type SseWriter = {
  send: (event: AskStreamEvent) => void
  end: () => void
}

/**
 * Minimal server-sent-events writer over the raw Node response. Each event is framed as
 * `event: <type>` + `data: <json>` — the payload also carries the type, so the client
 * parser only needs the data line (validated against askStreamEventSchema).
 */
export const createSseWriter = (res: ServerResponse): SseWriter => ({
  send: (event) => {
    if (res.writableEnded) return

    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
  },

  end: () => {
    if (!res.writableEnded) res.end()
  },
})
