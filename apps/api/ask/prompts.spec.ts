import type { ConversationMessage } from '@platform/components.domain'
import type { ChunkCandidate } from '../routes/assets/search/candidates.js'
import { answerPrompt, condensePrompt } from './prompts.js'

const message = (role: 'user' | 'assistant', content: string): ConversationMessage => ({
  id: 1,
  conversationId: 1,
  role,
  content,
  citations: null,
  createdAtUTC: new Date(),
})

const chunk = (overrides: Partial<ChunkCandidate>): ChunkCandidate => ({
  chunkId: 1,
  assetId: 1,
  assetName: 'notes.md',
  assetUrl: null,
  source: 'file',
  chunkIndex: 0,
  text: 'chunk text',
  relevance: 0.9,
  ...overrides,
})

describe('condensePrompt', () => {
  test('includes the conversation transcript and the final question', () => {
    const prompt = condensePrompt(
      [message('user', 'What is pgvector?'), message('assistant', 'A Postgres extension.')],
      'How do I index it?',
    )

    expect(prompt).toContain('User: What is pgvector?')
    expect(prompt).toContain('Assistant: A Postgres extension.')
    expect(prompt).toContain('Final user question: How do I index it?')
  })

  test('limits the transcript to the most recent turns', () => {
    const history = Array.from({ length: 10 }, (_, index) => message('user', `question ${index}`))

    const prompt = condensePrompt(history, 'latest')

    expect(prompt).not.toContain('question 3')
    expect(prompt).toContain('question 4')
    expect(prompt).toContain('question 9')
  })
})

describe('answerPrompt', () => {
  test('numbers sources to match citation ordinals', () => {
    const prompt = answerPrompt(
      [chunk({ assetName: 'first.md', text: 'alpha' }), chunk({
        assetName: null, assetUrl: 'https://example.com', source: 'url', text: 'beta',
      })],
      [],
      'What is alpha?',
    )

    expect(prompt).toContain('[1] first.md\nalpha')
    expect(prompt).toContain('[2] https://example.com\nbeta')
    expect(prompt).toContain('Question: What is alpha?')
  })

  test('omits the conversation section when there is no history', () => {
    const prompt = answerPrompt([chunk({})], [], 'q')

    expect(prompt).not.toContain('Recent conversation:')
  })

  test('includes the conversation section for follow-ups', () => {
    const prompt = answerPrompt([chunk({})], [message('user', 'earlier question')], 'q')

    expect(prompt).toContain('Recent conversation:\nUser: earlier question')
  })
})
