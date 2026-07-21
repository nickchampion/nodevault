import { askRequestSchema } from './conversations.js'

describe('askRequestSchema', () => {
  const base = { vaultId: 1, question: 'what is in this vault?' }

  test('defaults mode to local and needs no model', () => {
    const parsed = askRequestSchema.parse(base)

    expect(parsed.mode).toBe('local')
    expect(parsed.model).toBeUndefined()
  })

  test('requires a model when mode is openrouter', () => {
    const result = askRequestSchema.safeParse({ ...base, mode: 'openrouter' })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]).toMatchObject({ path: ['model'], message: 'Choose an OpenRouter model' })
  })

  test('accepts openrouter with a model', () => {
    const parsed = askRequestSchema.parse({ ...base, mode: 'openrouter', model: 'anthropic/claude-3.5-sonnet' })

    expect(parsed.model).toBe('anthropic/claude-3.5-sonnet')
  })

  test('ignores a stray model on non-openrouter modes', () => {
    const parsed = askRequestSchema.parse({ ...base, mode: 'local', model: 'anthropic/claude-3.5-sonnet' })

    expect(parsed.mode).toBe('local')
  })
})
