import type { AskStreamEvent } from '@platform/components.nodevault.contracts'
import { createSseParser } from './ask'

describe('createSseParser', () => {
  const collect = () => {
    const events: AskStreamEvent[] = []
    const parser = createSseParser((event) => {
      events.push(event)
    })

    return { events, parser }
  }

  test('parses a complete frame into a validated event', () => {
    const { events, parser } = collect()

    parser.feed('event: token\ndata: {"type":"token","text":"hello"}\n\n')

    expect(events).toEqual([{ type: 'token', text: 'hello' }])
  })

  test('buffers frames split across arbitrary chunk boundaries', () => {
    const { events, parser } = collect()
    const frame = 'event: token\ndata: {"type":"token","text":"hello world"}\n\n'

    for (const char of frame) parser.feed(char)

    expect(events).toEqual([{ type: 'token', text: 'hello world' }])
  })

  test('parses multiple frames arriving in a single chunk', () => {
    const { events, parser } = collect()

    parser.feed(
      'data: {"type":"conversation","conversationId":1,"userMessageId":2}\n\n'
      + 'data: {"type":"token","text":"a"}\n\n'
      + 'data: {"type":"done","messageId":3}\n\n',
    )

    expect(events.map(event => event.type)).toEqual(['conversation', 'token', 'done'])
  })

  test('ignores comment frames (heartbeats)', () => {
    const { events, parser } = collect()

    parser.feed(':ok\n\ndata: {"type":"token","text":"x"}\n\n')

    expect(events).toEqual([{ type: 'token', text: 'x' }])
  })

  test('skips frames with malformed JSON without dropping later ones', () => {
    const { events, parser } = collect()

    parser.feed('data: {not json}\n\ndata: {"type":"token","text":"x"}\n\n')

    expect(events).toEqual([{ type: 'token', text: 'x' }])
  })

  test('skips valid JSON that fails event schema validation', () => {
    const { events, parser } = collect()

    parser.feed('data: {"type":"unknown"}\n\ndata: {"type":"token","text":"x"}\n\n')

    expect(events).toEqual([{ type: 'token', text: 'x' }])
  })

  test('keeps an incomplete trailing frame buffered until terminated', () => {
    const { events, parser } = collect()

    parser.feed('data: {"type":"token","text":"x"}\n')
    expect(events).toEqual([])

    parser.feed('\n')
    expect(events).toEqual([{ type: 'token', text: 'x' }])
  })
})
