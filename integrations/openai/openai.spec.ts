import { serverConfiguration } from '@platform/components.configuration.server'
import {
  assetIdFromFilename, createOpenAiClient, embeddingDimensions, embeddingModel, vaultFilter,
} from './openai.js'

const env = serverConfiguration.environment.environment
const testConfig = { apiKey: 'test-key' }

const { embeddingsCreateMock, ctorMock } = vi.hoisted(() => ({
  embeddingsCreateMock: vi.fn(),
  ctorMock: vi.fn(),
}))

vi.mock('openai', () => ({
  default: class {
    embeddings = { create: embeddingsCreateMock }

    constructor(...args: unknown[]) {
      ctorMock(...args)
    }
  },
  toFile: vi.fn(),
}))

describe('createOpenAiClient().embedChunks', () => {
  beforeEach(() => {
    embeddingsCreateMock.mockReset()
    ctorMock.mockReset()
  })

  test('sends one request for all inputs, with the configured model and dimensionality', async () => {
    embeddingsCreateMock.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2] }],
    })

    await createOpenAiClient(testConfig).embedChunks(['hello world'])

    expect(embeddingsCreateMock).toHaveBeenCalledWith({
      model: embeddingModel,
      input: ['hello world'],
      dimensions: embeddingDimensions,
    })
  })

  test('throws when OpenAI returns a different number of embeddings than inputs', async () => {
    embeddingsCreateMock.mockResolvedValue({
      data: [{ embedding: [1, 0] }],
    })

    await expect(createOpenAiClient(testConfig).embedChunks(['a', 'b'])).rejects.toThrow(
      'OpenAI returned 1 embeddings for 2 inputs',
    )
  })

  test('throws when OpenAI returns an empty embedding', async () => {
    embeddingsCreateMock.mockResolvedValue({
      data: [{ embedding: [] }],
    })

    await expect(createOpenAiClient(testConfig).embedChunks(['a'])).rejects.toThrow(
      'OpenAI returned an empty embedding',
    )
  })

  test('surfaces the underlying error when the request itself fails (e.g. invalid key)', async () => {
    embeddingsCreateMock.mockRejectedValue(new Error('401 Incorrect API key provided'))

    await expect(createOpenAiClient(testConfig).embedChunks(['a'])).rejects.toThrow(
      /Incorrect API key/,
    )
  })
})

describe('createOpenAiClient().embedQuery', () => {
  beforeEach(() => {
    embeddingsCreateMock.mockReset()
    ctorMock.mockReset()
  })

  test('sends a single-item request', async () => {
    embeddingsCreateMock.mockResolvedValue({
      data: [{ embedding: [0.3, 0.4] }],
    })

    const embedding = await createOpenAiClient(testConfig).embedQuery('find me something')

    expect(embeddingsCreateMock).toHaveBeenCalledWith({
      model: embeddingModel,
      input: ['find me something'],
      dimensions: embeddingDimensions,
    })
    expect(embedding).toEqual([0.3, 0.4])
  })
})

describe('assetIdFromFilename', () => {
  test('parses the asset id from an environment-prefixed filename', () => {
    expect(assetIdFromFilename(`${env}-asset-36.txt`)).toBe(36)
  })

  test('returns undefined for a filename that is not an asset', () => {
    expect(assetIdFromFilename('readme.txt')).toBeUndefined()
  })

  test('returns undefined for a missing filename', () => {
    expect(assetIdFromFilename(undefined)).toBeUndefined()
  })
})

describe('vaultFilter', () => {
  test('builds an eq attribute filter on vaultId', () => {
    expect(vaultFilter(13)).toEqual({ type: 'eq', key: 'vaultId', value: 13 })
  })
})
