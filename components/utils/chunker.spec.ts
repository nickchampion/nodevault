import { describe, expect, it } from 'vitest'
import { chunkText } from './chunker.js'

const paragraph = (seed: string, length: number) => seed.repeat(Math.ceil(length / seed.length)).slice(0, length)

describe('chunkText', () => {
  it('returns no chunks for empty or whitespace-only text', () => {
    expect(chunkText('')).toEqual([])
    expect(chunkText('   \n\n \t ')).toEqual([])
  })

  it('returns a single chunk for short text', () => {
    expect(chunkText('hello world')).toEqual(['hello world'])
  })

  it('keeps paragraphs together when they fit', () => {
    const text = 'first paragraph\n\nsecond paragraph'

    expect(chunkText(text)).toEqual(['first paragraph\n\nsecond paragraph'])
  })

  it('never produces a chunk above the limit', () => {
    const text = Array.from({ length: 20 }, (_, index) => paragraph(`para ${index} lorem ipsum `, 400)).join('\n\n')

    const chunks = chunkText(text, { maxChars: 1000, overlapChars: 150 })

    expect(chunks.length).toBeGreaterThan(1)

    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(1000)
    }
  })

  it('splits on paragraph boundaries where possible', () => {
    const first = paragraph('alpha bravo charlie ', 600)
    const second = paragraph('delta echo foxtrot ', 600)

    const chunks = chunkText(`${first}\n\n${second}`, { maxChars: 700, overlapChars: 0 })

    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toBe(first.trim())
    expect(chunks[1]).toBe(second.trim())
  })

  it('seeds each chunk with the tail of the previous one', () => {
    const first = paragraph('alpha bravo charlie ', 600)
    const second = paragraph('delta echo foxtrot ', 600)

    const chunks = chunkText(`${first}\n\n${second}`, { maxChars: 700, overlapChars: 100 })

    expect(chunks).toHaveLength(2)

    const seed = chunks[1].split('\n\n', 1)[0]

    expect(seed.length).toBeGreaterThan(0)
    expect(seed.length).toBeLessThanOrEqual(100)
    expect(chunks[0].endsWith(seed)).toBe(true)
  })

  it('hard-splits a single oversized paragraph', () => {
    const text = paragraph('no paragraph breaks here just words ', 5000)

    const chunks = chunkText(text, { maxChars: 1000, overlapChars: 0 })

    expect(chunks.length).toBeGreaterThanOrEqual(5)

    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(1000)
    }

    // nothing lost beyond the whitespace trimmed at cut points
    expect(chunks.join(' ').replaceAll(/\s+/g, ' ')).toBe(text.trim().replaceAll(/\s+/g, ' '))
  })

  it('is deterministic', () => {
    const text = Array.from({ length: 10 }, (_, index) => paragraph(`para ${index} content `, 500)).join('\n\n')

    expect(chunkText(text)).toEqual(chunkText(text))
  })
})
