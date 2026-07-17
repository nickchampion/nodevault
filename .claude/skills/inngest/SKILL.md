---
name: inngest
description: Repo-specific Inngest patterns — adding workflow functions, sending events, step design, DB access inside functions, typed event schemas, and running the local dev server. Use whenever creating or modifying an Inngest function, defining a new event, or debugging workflow runs.
---

# Inngest in this repo

The Inngest client and all functions live in `apps/api/inngest/index.ts` (client id `nodevault`). Functions are exported via the `functions` array and served at `/api/inngest` by the Koa middleware in `apps/api/inngest/middleware.ts` — registering a new function means adding it to that array, nothing else.

We are on **inngest v4**: triggers are declared as an array (`triggers: [{ event: '...' }]`), not the v3 single-object form.

## Running locally

```bash
pnpm run api      # API on api.nodevault.local:8002 (serves /api/inngest)
pnpm run inngest  # Inngest Dev Server UI on http://localhost:8288, auto-discovers the endpoint
```

`isDev` comes from `serverConfiguration.dev` — signature verification is off locally. In production `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` must be set.

## Event naming & typing

Events are named `domain/noun.verb` in past tense for facts, imperative for commands: `content/item.submitted`, `content/item.vectorised`. Define event payloads with zod schemas in `@platform/components.contracts` (they are part of the system's shared vocabulary) and register them on the client with `EventSchemas` so `event.data` is typed:

```typescript
import { EventSchemas, Inngest } from 'inngest'
import { z } from 'zod'

export const inngest = new Inngest({
  id: 'nodevault',
  isDev: serverConfiguration.dev,
  schemas: new EventSchemas().fromZod({
    'content/item.submitted': { data: contentSubmittedEventSchema },
  }),
})
```

## Sending events from API handlers

Import the client and send from within an `ApiHandler` after the DB write; the handler's transaction commits after it returns, so prefer sending the event with ids only (the function re-reads state) rather than embedding row data that could roll back:

```typescript
await inngest.send({ name: 'content/item.submitted', data: { itemId } })
```

If exactly-once matters, note `inngest.send` is not part of the request transaction — a rolled-back request may still have emitted the event. Design functions to tolerate this: re-read the row by id and no-op if absent.

## Step design rules

- Wrap every side effect (DB write, HTTP call, LLM call) in `step.run('name', fn)` — each step is retried independently and memoised, so code between steps must be cheap and deterministic.
- Step return values are JSON-serialised: `Date` becomes a string on replay. Return plain data (ISO strings via `toUtcIso`), never rows with `Date` fields you'll compare later.
- Make steps idempotent — retries re-run the step. Use upserts / `insert ... on conflict` keyed by natural ids.
- Fan-out with `Promise.all` over `step.run` calls for parallel work (e.g. embedding chunks in batches).
- Non-retriable failures (bad input, unsupported file type): throw `NonRetriableError` from `inngest` so the run fails fast instead of retrying.
- Configure per-function `retries`, `concurrency: { limit }` and `throttle` on the function definition — throttling matters for free-tier LLM rate limits.

## DB access inside functions

Inngest functions run outside the tRPC request lifecycle — there is **no `context.session`, no middy transaction**. Create a session from the shared pool per step and manage commit explicitly, or use plain pool queries. Do not import anything from the request `Context`. If a reusable helper doesn't exist yet, create one in `apps/api/inngest/` (e.g. a `withSession(fn)` that builds a `PgSession` from the process pool) rather than instantiating pools per function. Each `step.run` should be its own unit of work — never hold a transaction across steps (steps may run on different executions).

## Status tracking for user-driven workflows

User-facing workflows persist progress to a status column on the domain row (`pending → processing → ready | failed`) updated inside steps; the frontend polls a normal tRPC query for it. Don't build websocket/realtime plumbing unless asked — Inngest's own run state is for ops (Dev Server UI), not for the product UI.
