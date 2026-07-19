import { askStreamEventSchema } from '@platform/components.contracts'
import type { AskMode, AskStreamEvent } from '@platform/components.contracts'
import { appConfig } from './config'
import { getSession } from './auth'

/**
 * Incremental SSE frame parser. Feed it decoded text as it arrives; complete frames are
 * parsed, validated against the shared event schema, and passed to onEvent. Comment
 * frames (heartbeats) and anything that fails validation are skipped.
 */
export const createSseParser = (onEvent: (event: AskStreamEvent) => void) => {
  let buffer = ''

  return {
    feed: (text: string) => {
      buffer += text

      let boundary = buffer.indexOf('\n\n')

      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary)

        buffer = buffer.slice(boundary + 2)
        boundary = buffer.indexOf('\n\n')

        const data = frame
          .split('\n')
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trim())
          .join('')

        if (!data) continue

        try {
          const event = askStreamEventSchema.safeParse(JSON.parse(data))

          if (event.success) onEvent(event.data)
        } catch {
          // malformed frame — skip it rather than killing the stream
        }
      }
    },
  }
}

export type StreamAskArgs = {
  vaultId: number
  conversationId?: number
  question: string
  mode: AskMode
  signal: AbortSignal
  onEvent: (event: AskStreamEvent) => void
}

/**
 * POSTs a question to the ask endpoint and consumes the SSE response. This goes through
 * a plain fetch rather than the tRPC client — token streaming needs a ReadableStream,
 * and EventSource can neither POST nor send the Authorization header.
 */
export const streamAsk = async ({
  vaultId, conversationId, question, mode, signal, onEvent,
}: StreamAskArgs): Promise<void> => {
  const config = appConfig()
  const session = getSession()

  const response = await fetch(`${config.api}/ask/stream`, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      ...(session?.tokens.access && { authorization: `Bearer ${session.tokens.access}` }),
    },
    body: JSON.stringify({
      vaultId, conversationId, question, mode,
    }),
  })

  if (!response.ok || !response.body) {
    let message = 'Failed to ask the question'

    try {
      message = ((await response.json()) as { message?: string }).message ?? message
    } catch {
      // non-JSON error body — keep the fallback message
    }

    throw new Error(message)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const parser = createSseParser(onEvent)

  for (;;) {
    const { done, value } = await reader.read()

    if (done) break

    parser.feed(decoder.decode(value, { stream: true }))
  }
}
