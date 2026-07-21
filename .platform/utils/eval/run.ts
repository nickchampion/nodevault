import { parseArgs } from 'node:util'
import { pool } from '../../../apps/api/utils/db.js'
import { loadGoldSet } from './gold.js'
import { runEval } from './harness.js'
import type { CaseResult } from './harness.js'

/**
 * Retrieval eval runner. Boots exactly like the API (needs the NODEVAULT env var and a
 * reachable Postgres + AI credentials), replays a gold set of questions through the live
 * hybrid retrieval, and prints per-case and aggregate scores.
 *
 *   NODEVAULT=... pnpm run eval:retrieval -- --gold .platform/utils/eval/gold.json
 *
 * Workflow: record a baseline (--no-hyde), change one thing (HyDE, contextual chunks,
 * a reranker), re-run, compare the summary block. Nothing here mutates the database.
 */

const pct = (value: number): string => `${(value * 100).toFixed(1)}%`
const truncate = (text: string, max: number): string => (text.length <= max ? text : `${text.slice(0, max - 1)}…`)

const printCase = (result: CaseResult, verbose: boolean): void => {
  const { score } = result
  const flag = score.hit ? '✓' : '✗ MISS'

  console.log(
    `  ${flag.padEnd(7)} P@k ${pct(score.precisionAtK).padStart(6)} · recall ${pct(score.assetRecallAtK).padStart(6)}`
    + ` · RR ${score.reciprocalRank.toFixed(2)} · nDCG ${score.ndcgAtK.toFixed(2)}  ${truncate(result.case.question, 60)}`,
  )

  if (verbose) {
    const relevant = new Set(result.case.relevantAssetIds)

    result.retrieved.forEach((chunk, index) => {
      const mark = relevant.has(chunk.assetId) ? '●' : '○'

      console.log(`      ${String(index + 1).padStart(2)}. ${mark} asset ${chunk.assetId} — ${truncate(chunk.assetName ?? 'Untitled', 50)}`)
    })
  }
}

const main = async (): Promise<void> => {
  const { values } = parseArgs({
    options: {
      gold: { type: 'string', default: '.platform/utils/eval/gold.json' },
      k: { type: 'string' },
      // --hyde / --no-hyde override the pipeline default; omit to inherit HYDE_ENABLED
      hyde: { type: 'boolean' },
      'no-hyde': { type: 'boolean' },
      verbose: { type: 'boolean', short: 'v', default: false },
    },
  })

  const gold = loadGoldSet(values.gold)
  const k = values.k ? Number(values.k) : undefined

  if (k !== undefined && (!Number.isSafeInteger(k) || k <= 0)) throw new Error(`--k must be a positive integer, got ${values.k}`)

  const hyde = values['no-hyde'] ? false : values.hyde
  const report = await runEval(gold, { k, hyde })

  console.log(`\nRetrieval eval — ${report.results.length} cases @ k=${report.options.k} · HyDE ${report.options.hyde ? 'on' : 'off'}\n`)

  for (const result of report.results) printCase(result, values.verbose)

  const { summary } = report

  console.log('\n  ── summary ──────────────────────────────')
  console.log(`  hit rate          ${pct(summary.hitRate)}   (a relevant chunk reached the prompt)`)
  console.log(`  asset recall@k    ${pct(summary.meanAssetRecallAtK)}   (expected docs surfaced)`)
  console.log(`  precision@k       ${pct(summary.meanPrecisionAtK)}   (prompt signal-to-noise)`)
  console.log(`  MRR               ${summary.mrr.toFixed(3)}   (how high the first hit ranked)`)
  console.log(`  nDCG@k            ${summary.meanNdcgAtK.toFixed(3)}   (overall ranking quality)\n`)
}

try {
  await main()
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  await pool.end()
}
