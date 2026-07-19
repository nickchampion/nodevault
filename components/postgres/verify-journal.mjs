#!/usr/bin/env node
/* eslint-disable unicorn/import-style */
// Guards against hand-edited/bogus timestamps in migrations/meta/_journal.json.
// Drizzle's migrator fetches the single most recent `created_at` from the target
// database and compares every migration file's `when` against that one fixed value
// for the whole run — a future-dated entry silently blocks every migration generated
// after it, on every environment, with no error. See docs/migrations.md.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const journalPath = join(dirname(fileURLToPath(import.meta.url)), 'migrations/meta/_journal.json')
const journal = JSON.parse(readFileSync(journalPath, 'utf8'))

const oneDayMs = 24 * 60 * 60 * 1000
const errors = []

let previous = null

for (const entry of journal.entries) {
  if (entry.when > Date.now() + oneDayMs) {
    errors.push(`${entry.tag} (idx ${entry.idx}) has a future \`when\` timestamp: ${entry.when} (${new Date(entry.when).toISOString()})`)
  }

  if (previous !== null && entry.when <= previous) {
    errors.push(`${entry.tag} (idx ${entry.idx}) has \`when\` ${entry.when} that does not exceed the previous entry's ${previous} — migrations after this point will be silently skipped`)
  }

  previous = entry.when
}

if (errors.length > 0) {
  console.error('✗ migrations/meta/_journal.json has invalid timestamps:\n')
  for (const error of errors) console.error(`  - ${error}`)
  console.error('\nNever hand-edit `when` in _journal.json — it must come from drizzle-kit generate.')
  process.exit(1)
}

console.log(`✓ _journal.json: ${journal.entries.length} entries, timestamps strictly increasing and not future-dated`)
