import { describe, expect, it } from 'vitest'
import {
  aggregate, assetRecallAtK, hitAtK, ndcgAtK, precisionAtK, reciprocalRank, scoreCase,
} from './metrics.js'
import type { RetrievedChunk } from './metrics.js'

const chunks = (...assetIds: number[]): RetrievedChunk[] => assetIds.map((assetId, index) => ({ chunkId: index + 1, assetId }))

describe('hitAtK', () => {
  it('is 1 when any slot is relevant', () => {
    expect(hitAtK([false, true, false])).toBe(1)
  })

  it('is 0 when nothing is relevant', () => {
    expect(hitAtK([false, false])).toBe(0)
  })
})

describe('precisionAtK', () => {
  it('is the fraction of the k slots that are relevant', () => {
    expect(precisionAtK([true, false, true, false], 4)).toBe(0.5)
  })

  it('divides by k, not by the number retrieved', () => {
    // only 2 chunks came back but the prompt had room for 8 — precision reflects the wasted budget
    expect(precisionAtK([true, true], 8)).toBe(0.25)
  })

  it('is 0 for k of 0', () => {
    expect(precisionAtK([], 0)).toBe(0)
  })
})

describe('reciprocalRank', () => {
  it('rewards an earlier first hit', () => {
    expect(reciprocalRank([false, true, true])).toBe(1 / 2)
    expect(reciprocalRank([true, false])).toBe(1)
  })

  it('is 0 when nothing relevant is present', () => {
    expect(reciprocalRank([false, false])).toBe(0)
  })
})

describe('ndcgAtK', () => {
  it('is 1 when all relevant items are ranked first', () => {
    expect(ndcgAtK([true, true, false, false], 2)).toBe(1)
  })

  it('is below 1 when a relevant item is ranked late', () => {
    const perfect = ndcgAtK([true, false, false], 1)
    const delayed = ndcgAtK([false, false, true], 1)

    expect(perfect).toBe(1)
    expect(delayed).toBeGreaterThan(0)
    expect(delayed).toBeLessThan(perfect)
  })

  it('clamps to 1 when an asset contributes more relevant chunks than expected assets', () => {
    // two relevant chunks retrieved but only one distinct asset was expected
    expect(ndcgAtK([true, true], 1)).toBe(1)
  })

  it('is 0 when nothing is relevant or nothing is expected', () => {
    expect(ndcgAtK([false, false], 3)).toBe(0)
    expect(ndcgAtK([true, true], 0)).toBe(0)
  })
})

describe('assetRecallAtK', () => {
  it('counts distinct expected assets found, over total expected', () => {
    // expects assets 10 and 20; top-4 surfaces 10 (twice) and 20 → full recall
    const retrieved = chunks(10, 99, 10, 20)

    expect(assetRecallAtK(retrieved, new Set([10, 20]), 4)).toBe(1)
  })

  it('does not double-count multiple chunks from the same asset', () => {
    const retrieved = chunks(10, 10, 10)

    expect(assetRecallAtK(retrieved, new Set([10, 20]), 8)).toBe(0.5)
  })

  it('respects the k cutoff', () => {
    // asset 20 only appears at rank 5, outside a k of 4
    const retrieved = chunks(10, 10, 10, 10, 20)

    expect(assetRecallAtK(retrieved, new Set([10, 20]), 4)).toBe(0.5)
  })
})

describe('scoreCase', () => {
  it('scores a mixed retrieval over the prompt budget', () => {
    const retrieved = chunks(5, 99, 7, 99) // expected assets 5 and 7
    const score = scoreCase(retrieved, [5, 7], 4)

    expect(score).toMatchObject({
      relevantAssets: 2,
      retrieved: 4,
      hit: 1,
      precisionAtK: 0.5, // 2 of 4 slots relevant
      assetRecallAtK: 1, // both expected assets present
      reciprocalRank: 1, // first slot is relevant
    })
    expect(score.ndcgAtK).toBeGreaterThan(0)
    expect(score.ndcgAtK).toBeLessThanOrEqual(1)
  })

  it('reports a total miss — the case the harness exists to catch', () => {
    const score = scoreCase(chunks(1, 2, 3), [42], 8)

    expect(score).toMatchObject({
      hit: 0, precisionAtK: 0, assetRecallAtK: 0, reciprocalRank: 0, ndcgAtK: 0,
    })
  })
})

describe('aggregate', () => {
  it('means each metric across cases', () => {
    const hitAndMiss = [
      scoreCase(chunks(5), [5], 8), // perfect hit
      scoreCase(chunks(1), [9], 8), // total miss
    ]

    const result = aggregate(hitAndMiss)

    expect(result.cases).toBe(2)
    expect(result.hitRate).toBe(0.5)
    expect(result.mrr).toBe(0.5)
  })

  it('is all zeroes for no cases', () => {
    expect(aggregate([])).toEqual({
      cases: 0, hitRate: 0, meanPrecisionAtK: 0, meanAssetRecallAtK: 0, mrr: 0, meanNdcgAtK: 0,
    })
  })
})
