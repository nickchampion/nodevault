import { baseUrl, createOpenRouterClient, listOpenRouterModels } from './openrouter.js'

const { chatCreateMock, ctorMock } = vi.hoisted(() => ({
  chatCreateMock: vi.fn(),
  ctorMock: vi.fn(),
}))

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: chatCreateMock } }

    constructor(...args: unknown[]) {
      ctorMock(...args)
    }
  },
}))

describe('createOpenRouterClient', () => {
  beforeEach(() => {
    chatCreateMock.mockReset()
    ctorMock.mockReset()
    vi.restoreAllMocks()
  })

  test('points the OpenAI SDK at the OpenRouter base URL', () => {
    createOpenRouterClient({ apiKey: 'sk-or-test' })

    expect(ctorMock).toHaveBeenCalledWith({ apiKey: 'sk-or-test', baseURL: baseUrl })
  })

  test('verifyApiKey resolves when /key returns ok', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))

    await expect(createOpenRouterClient({ apiKey: 'sk-or-test' }).verifyApiKey()).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/key`, {
      headers: { Authorization: 'Bearer sk-or-test' },
    })
  })

  test('verifyApiKey throws when /key is rejected', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }))

    await expect(createOpenRouterClient({ apiKey: 'bad' }).verifyApiKey()).rejects.toThrow(
      'OpenRouter rejected this API key',
    )
  })

  test('generateAnswerStream sends the chosen model and yields only content deltas', async () => {
    chatCreateMock.mockResolvedValue((async function* () {
      yield { choices: [{ delta: { content: 'Hel' } }] }
      yield { choices: [{ delta: {} }] }
      yield { choices: [{ delta: { content: 'lo' } }] }
    })())

    const stream = createOpenRouterClient({ apiKey: 'sk-or-test' })
      .generateAnswerStream('anthropic/claude-3.5-sonnet', 'be brief', 'hi')

    let answer = ''

    for await (const chunk of stream) answer += chunk

    // the empty-delta chunk is skipped, the two content deltas are concatenated
    expect(answer).toBe('Hello')
    expect(chatCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'anthropic/claude-3.5-sonnet', stream: true }),
      expect.objectContaining({ signal: undefined }),
    )
  })

  const drain = async (stream: AsyncIterable<string>): Promise<string> => {
    let answer = ''

    for await (const chunk of stream) answer += chunk

    return answer
  }

  test('surfaces an in-band provider error chunk with its actionable detail', async () => {
    chatCreateMock.mockResolvedValue((async function* () {
      yield {
        error: { message: 'Provider returned error', code: 429, metadata: { raw: 'gemma is rate-limited upstream' } },
      }
    })())

    const stream = createOpenRouterClient({ apiKey: 'sk-or-test' })
      .generateAnswerStream('google/gemma:free', 'be brief', 'hi')

    await expect(drain(stream)).rejects.toThrow('OpenRouter: gemma is rate-limited upstream')
  })

  test('extracts the error when the request itself is rejected', async () => {
    chatCreateMock.mockRejectedValue({ error: { message: 'Provider returned error', metadata: { raw: 'boom' } } })

    const stream = createOpenRouterClient({ apiKey: 'sk-or-test' })
      .generateAnswerStream('some/model', 'be brief', 'hi')

    await expect(drain(stream)).rejects.toThrow('OpenRouter: boom')
  })

  test('falls back to a generic message when the error is unparseable', async () => {
    chatCreateMock.mockRejectedValue(new TypeError('socket hang up'))

    const stream = createOpenRouterClient({ apiKey: 'sk-or-test' })
      .generateAnswerStream('some/model', 'be brief', 'hi')

    // TypeError.message is used as the fallback detail
    await expect(drain(stream)).rejects.toThrow('OpenRouter: socket hang up')
  })
})

describe('listOpenRouterModels', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('drops non-text models, projects the fields, and sorts free-first then by name', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      data: [
        {
          id: 'z/text', name: 'Zeta', context_length: 8000, pricing: { prompt: '0.001', completion: '0.002' },
        },
        {
          id: 'img/only', name: 'Imagine', architecture: { output_modalities: ['image'] },
        },
        {
          id: 'a/paid', name: 'Alpha', pricing: { prompt: '0.001', completion: '0' },
        },
        {
          id: 'y/free', name: 'Yotta', pricing: { prompt: '0', completion: '0' },
        },
        {
          id: 'b/free', name: 'Bravo', pricing: { prompt: '0', completion: '0' },
        },
      ],
    }))

    const models = await listOpenRouterModels()

    // free models (Bravo, Yotta) first alphabetically, then paid (Alpha, Zeta) alphabetically
    expect(models.map(model => model.id)).toEqual(['b/free', 'y/free', 'a/paid', 'z/text'])
    expect(models[3]).toEqual({
      id: 'z/text', name: 'Zeta', contextLength: 8000, promptPrice: '0.001', completionPrice: '0.002',
    })
    // a half-zero price is still paid (only both-zero counts as free)
    expect(models.find(model => model.id === 'a/paid')).toMatchObject({ promptPrice: '0.001', completionPrice: '0' })
  })

  test('throws when the models request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }))

    await expect(listOpenRouterModels()).rejects.toThrow('OpenRouter models request failed (503)')
  })
})
