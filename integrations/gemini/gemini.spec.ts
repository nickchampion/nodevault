import {
  createGeminiClient, embeddingDimensions, embeddingModel,
} from './gemini.js'

const { embedContentMock, ctorMock } = vi.hoisted(() => ({
  embedContentMock: vi.fn(),
  ctorMock: vi.fn(),
}))

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { embedContent: embedContentMock }

    constructor(...args: unknown[]) {
      ctorMock(...args)
    }
  },
}))

describe('createGeminiClient', () => {
  beforeEach(() => {
    embedContentMock.mockReset()
    ctorMock.mockReset()
  })

  test('sends one request per call, with the configured model and dimensionality', async () => {
    embedContentMock.mockResolvedValue({
      embeddings: [{ values: [3, 4] }],
    })

    await createGeminiClient().embedChunks(['hello world'])

    expect(embedContentMock).toHaveBeenCalledWith({
      model: embeddingModel,
      contents: ['hello world'],
      config: {
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: embeddingDimensions,
      },
    })
  })

  test('normalises returned embeddings to unit length', async () => {
    embedContentMock.mockResolvedValue({
      embeddings: [{ values: [3, 4] }],
    })

    const [embedding] = await createGeminiClient().embedChunks(['hello world'])

    expect(embedding).toEqual([0.6, 0.8])
  })

  test('leaves an all-zero embedding untouched instead of dividing by zero', async () => {
    embedContentMock.mockResolvedValue({
      embeddings: [{ values: [0, 0] }],
    })

    const [embedding] = await createGeminiClient().embedChunks(['hello world'])

    expect(embedding).toEqual([0, 0])
  })

  test('throws when Gemini returns a different number of embeddings than inputs', async () => {
    embedContentMock.mockResolvedValue({
      embeddings: [{ values: [1, 0] }],
    })

    await expect(createGeminiClient().embedChunks(['a', 'b'])).rejects.toThrow(
      'Gemini returned 1 embeddings for 2 inputs',
    )
  })

  test('throws when Gemini returns an empty embedding', async () => {
    embedContentMock.mockResolvedValue({
      embeddings: [{ values: [] }],
    })

    await expect(createGeminiClient().embedChunks(['a'])).rejects.toThrow(
      'Gemini returned an empty embedding',
    )
  })

  test('surfaces the underlying error when the request itself fails (e.g. permission denied)', async () => {
    embedContentMock.mockRejectedValue(
      new Error('[403 Forbidden] Generative Language API has not been used or is disabled'),
    )

    await expect(createGeminiClient().embedChunks(['a'])).rejects.toThrow(
      /Generative Language API has not been used/,
    )
  })
})

describe('createGeminiClient().embedQuery', () => {
  beforeEach(() => {
    embedContentMock.mockReset()
    ctorMock.mockReset()
  })

  test('sends a single-item request with the RETRIEVAL_QUERY task type', async () => {
    embedContentMock.mockResolvedValue({
      embeddings: [{ values: [3, 4] }],
    })

    await createGeminiClient().embedQuery('find me something')

    expect(embedContentMock).toHaveBeenCalledWith({
      model: embeddingModel,
      contents: ['find me something'],
      config: {
        taskType: 'RETRIEVAL_QUERY',
        outputDimensionality: embeddingDimensions,
      },
    })
  })

  test('normalises the returned embedding to unit length', async () => {
    embedContentMock.mockResolvedValue({
      embeddings: [{ values: [3, 4] }],
    })

    const embedding = await createGeminiClient().embedQuery('find me something')

    expect(embedding).toEqual([0.6, 0.8])
  })
})
