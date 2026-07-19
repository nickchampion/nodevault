# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend dev server (Next.js, port 8001)
pnpm run app

# API dev server (tsx watch)
pnpm run api

# Build frontend for Cloudflare
pnpm run app:build

# Lint all (with autofix)
pnpm run lint

# Run all tests
npx vitest

# Run a single test file
npx vitest components/configuration/builder.spec.ts

# Type check entire workspace
npx tsc --noEmit
```

## Monorepo Structure

```
apps/
  api/          Node.js API server (tRPC appRouter + domain routers/ApiHandlers in routes/)
  nodevault/    Next.js 15 frontend app (App Router, React 19, HeroUI v3; Cloudflare Workers via OpenNext)
components/
  api/          Api (Koa host for tRPC), trpc helpers (router, procedures, execute),
                Response, StandardResponse/ValidationError types
  configuration/ Config builder (build<T>()) + server config (reads NODEVAULT env var)
  context/      Context, InboundEvent, Response wiring, Session interface, Log, middy
  contracts/    Public API contracts: zod request/response schemas, DTO types, shared
                vocabulary (Phone, Countries, UserRole) — client-safe, consumed by both sides
  domain/       Globally shared server-side types: Drizzle schema + inferred row types
                (models/), AppError/normalizeError, QuerySettings
  postgres/     PgSession unit of work over Postgres, pool factory, generated migrations
  utils/        Pure utilities (string, date, math, etc.)
  utils-server/ Node-only utilities (crypto, auth tokens, streams)
integrations/
  resend/       Transactional email client
```

NX manages tasks. Each component and app has a `project.json`. Package aliases are declared in the root `tsconfig.json` `paths` and resolved at runtime via `tsx` (API) or the app's own `tsconfig.json` `paths` (Next.js — kept in sync with the root aliases).

## Path Aliases

All `@platform/components.*` imports resolve to local `components/` directories. Never use relative paths across component boundaries — always use the alias (e.g. `@platform/components.utils`). The frontend imports the API router **type** via `@platform/apps.api` (type-only — never import runtime values from the API into the frontend).

## API Handler Pattern

The API is a tRPC router hosted on Koa, but business logic lives in ApiHandlers. Handlers declare their contract types as generics — `ApiHandler<RequestType, ResponseType>` — which types `context.event.payload` and makes `response.ok(...)`/`created(...)` check their argument against the response contract (no casts):

```typescript
import type { ApiHandler } from '@platform/components.context'
import type { LoginRequest, OkResponse } from '@platform/components.nodevault.contracts'

export const authLogin: ApiHandler<LoginRequest, OkResponse> = async (context) => {
  const body = context.event.payload  // typed as LoginRequest (validated procedure input)
  const user = await context.session.db.query.users.findFirst({ where: eq(users.email, body.email) })
  return context.event.response.ok()  // bare ok() allowed because TBody is OkResponse
}
```

Handlers are grouped by domain in `apps/api/routes/`. Each subdirectory's `index.ts` defines that domain's router, wiring handlers onto tRPC procedures via the `execute()` bridge from `@platform/components.api`. Input and output schemas come from `@platform/components.nodevault.contracts`; every procedure declares `.output()` so responses are validated (and excess fields stripped) at runtime:

```typescript
// apps/api/routes/auth/index.ts
export const authRouter = router({
  verify: publicProcedure
    .input(verifyRequestSchema)
    .output(verifyLoginResponseSchema)
    .mutation(execute(authVerify)),
})
```

`execute()` infers the handler's declared `ApiHandler<TIn, TOut>` types onto the resolver, so tRPC verifies them against the `.input()`/`.output()` schemas at compile time — a handler whose declared types disagree with the procedure's schemas is a type error at the wiring site.

`apps/api/router.ts` merges the domain routers into the appRouter, one namespace per domain (`auth.login`, `comms.contact`, ...):

```typescript
export const appRouter = router({
  auth: authRouter,
  comms: commsRouter,
  system: systemRouter,
})
```

`execute()` runs the handler through the middy lifecycle and unwraps the `Response`: 2xx returns the body, anything else becomes a `TRPCError` carrying the standard envelope (message, code, `validation` array).

Auth: use `publicProcedure`, `protectedProcedure` (valid unexpired token) or `roleProcedure('admin', ...)`. The token is decoded into `context.user` per request; the auth middleware sets `context.authorised`.

## Request Lifecycle

```
Koa → Api.handleRoute()  (CORS preflight, /trpc prefix routing)
  → tRPC node-http adapter
  → createContext: InboundEvent from Koa request, Context created, user decoded from token
  → procedure: zod input validation → execute(handler):
      input becomes context.event.payload
      middy() wrapper:
        before: begin transaction (mutating methods only), set up logging, start timer
        handler: your ApiHandler
        after: commit the transaction (rollback on 4xx response or session.veto),
               set response headers (elapsed, CF geo)
        error: rollback the transaction, log, emit 'error', normalise error
  → Response unwrapped (2xx body or TRPCError) → tRPC writes HTTP response
```

## Background Workflows (Inngest)

Durable background workflows run on Inngest. The client and all functions live in `apps/api/inngest/index.ts`; functions register by joining the exported `functions` array and are served at `/api/inngest` by the Koa middleware (`apps/api/inngest/middleware.ts`). Local dev: `pnpm run inngest` starts the Dev Server UI at http://localhost:8288 alongside `pnpm run api`. API handlers trigger workflows with `inngest.send({ name: 'domain/noun.verb', data: { id } })` — send ids, not row data. Inngest functions run **outside** the tRPC request lifecycle: no `context.session`, no automatic transaction — each `step.run` manages its own DB access. See the `inngest` skill for function/step conventions and the `new-workflow` skill for the end-to-end checklist.

## Database (Postgres + Drizzle)

The schema is defined in TypeScript in `components/nodevault/domain/models/`, one file per domain area (exported from `@platform/components.nodevault.domain`, both as named tables/types and as the `schema` namespace) — it is the single source of truth for storage, shared by every server-side project (API, event handlers, background workers). Importing table definitions is safe anywhere server-side (`drizzle-orm/pg-core` is metadata only — no driver attached), but the **frontend must not import it** — clients consume `@platform/components.nodevault.contracts` only. Property names are camelCase (e.g. `createdAtUTC`), mapped to snake_case columns. Row types are inferred (`type User = typeof users.$inferSelect`) — there are no model classes.

Rows never cross the HTTP boundary: responses are DTOs defined in `@platform/components.nodevault.contracts`, built by explicit mapper functions colocated with the routes (e.g. `routes/auth/mappers.ts`, `toUserDto(user)`). Mappers pick fields explicitly (new columns stay private until deliberately exposed) and convert `Date` → UTC ISO string (`toUtcIso`). The procedure's `.output()` schema enforces the contract at runtime.

`context.session` is a `PgSession` from `@platform/components.postgres`. Query through Drizzle via `context.session.db`:

```typescript
import { and, eq, gt } from 'drizzle-orm'
import { users, loginTokens } from '@platform/components.nodevault.domain'

const user = await context.session.db.query.users.findFirst({ where: eq(users.email, email) })
const [row] = await context.session.db.insert(loginTokens).values({ ... }).returning()
// raw SQL escape hatch (same transaction routing):
await context.session.queryOne<T>('SELECT ...', [params])
```

`session.db` is typed via a module augmentation in `components/nodevault/domain/client.ts` (`DatabaseClient extends NodePgDatabase<typeof schema>`), loaded automatically whenever `@platform/components.nodevault.domain` is imported — any server-side project gets the typed client for free. The context component itself stays ORM-agnostic.

**Unit of work = one transaction around the handler.** The context middleware calls `session.begin()` before any mutating handler (POST/PUT/PATCH/DELETE) runs and commits after it completes; every statement — Drizzle or raw — routes through the session and joins that transaction. A thrown error, a 4xx response, or `context.session.veto = true` rolls the whole transaction back. Handlers never manage transactions themselves (don't use `db.transaction()`). Read-only handlers run against the pool; one that genuinely needs a transaction can call `context.session.begin()` itself.

Conventions:

- **Migrations**: edit the schema in `components/nodevault/domain/models/`, then `pnpm run db:generate --name=<change>` (emits SQL to `components/postgres/migrations/` — review it) and `pnpm run db` to apply. Custom SQL (backfills etc.): `pnpm run db:generate --custom --name=<change>`. Never hand-edit applied migrations. `pnpm run db:studio` opens a data browser. Full guide: `docs/migrations.md`.
- No optimistic-concurrency/version machinery: transactions + row locks cover in-request atomicity. Prefer atomic statements for check-and-act (e.g. `update ... where used = false ... returning`)
- Unique violations (23505) are mapped to a 409 conflict with a message derived from the constraint name — name constraints accordingly (e.g. `users_email_unique`)
- `begin()` is lazy: the connection is only checked out on the first statement, and only held until commit/rollback
- Timestamps are `timestamptz` in `mode: 'date'` — Drizzle returns `Date` objects; mappers convert them to UTC ISO strings for responses

Connection config lives in `serverConfiguration.postgres` (dev default `postgres://nodevault:nodevault@localhost:5432/nodevault`, prod from `DATABASE_URL`; drizzle-kit reads the same URL via `drizzle.config.ts`). Local dev database: `docker start nodevault-postgres` (a `pgvector/pgvector:pg18` container).

## Adding a New API Endpoint

1. Add zod request + response schemas to `components/nodevault/contracts/<domain>.ts` (export inferred types too)
2. Create the handler in `apps/api/routes/<domain>/`; if it returns data, map rows to contract DTOs in `routes/<domain>/mappers.ts`
3. Add a procedure to the domain router in `apps/api/routes/<domain>/index.ts`: `publicProcedure.input(requestSchema).output(responseSchema).mutation(execute(handler))` (`.query()` for reads). For a new domain, create the subdirectory with its router and merge it into the appRouter in `apps/api/router.ts`
4. The frontend picks the new procedure up automatically through the `AppRouter` type — no client generation. For client-side form validation, reuse the contract schema via `zodValidate()` (see `apps/nodevault/lib/validation.ts`)

## Calling the API from the Frontend

`api` (in `apps/nodevault/lib/api.ts`) is a `createTRPCClient<AppRouter>` instance that attaches the session token from the auth cookie per request:

```typescript
import { api } from '../lib/api'

await api.comms.contact.mutate({ name, email, message, interests })  // throws TRPCClientError on failure
const pong = await api.system.ping.query()
```

Procedures are exposed over HTTP at `/trpc/<domain>.<procedure>` (e.g. `POST /trpc/auth.login`).

## Context & Response API

```typescript
// Reading the request
context.event.payload               // request body (zod-validated procedure input)
context.event.query                 // query params
context.event.getQuerySettings()    // pagination/sort/filter from query

// Building responses
context.event.response.ok(data)
context.event.response.created(data)
context.event.response.notFound()
context.event.response.badRequest(errors)
context.event.response.badRequestCustom(path, message)
context.event.response.unauthorised()
context.event.response.error(message)

// Logging (structured JSON)
context.log.info('message', { field: value })
context.log.warn(...)
context.log.error(...)
```

## Models, Contracts & the Mapping Layer

Three layers, with strict dependency direction (`api → domain → contracts ← nodevault` — the frontend touches contracts only):

- **Storage** (`components/nodevault/domain/models/`): Drizzle tables + inferred row types, shared across server-side projects via `@platform/components.nodevault.domain` (which also carries the `DatabaseClient` augmentation typing `session.db`); never imported by the frontend.
- **Contracts** (`@platform/components.nodevault.contracts`): zod request/response schemas, inferred DTO types, and shared vocabulary (`Phone`, `Countries`, `UserRole`, `AuthTokens`). Client-safe (zod only, no node imports) — the frontend imports these at runtime for form validation; the API uses them for `.input()`/`.output()`.
- **Mappers** (`apps/api/routes/<domain>/mappers.ts`): pure functions turning rows into DTOs. Explicit field picking is the point — never spread a row into a response.

Dates in contracts are ISO strings (`z.iso.datetime()`); mappers convert with `toUtcIso()`.

## Errors

Throw `AppError` from `@platform/components.nodevault.domain` with a kind (`'auth' | 'forbidden' | 'validation' | 'not-found' | 'conflict' | 'internal'`) — the kind derives the HTTP status. `normalizeError()` wraps unknown thrown values. The tRPC error formatter surfaces `data.validation` (array of `{ path, message }`) for both zod input failures and handler `badRequest` responses.

## Configuration

Server config is loaded from the `NODEVAULT` environment variable (base64-encoded JSON `{ key, salt, environment }`). Local dev overrides are read from the path in `NODEVAULT_OVERRIDES`. Config is frozen in production and test overrides are applied when `VITEST=true`.

## Date Handling

Use `@platform/components.utils` date utilities — never import `luxon` or `dayjs` directly:

```typescript
import { nowUtcIso, formatLocalDate, isExpired, expiresInSeconds } from '@platform/components.utils'
```

All dates persisted and sent over the API are UTC ISO strings (`Z` suffix). Convert to local time for display only using `formatLocalDate()`.

## TypeScript

- Each component directory has its own `tsconfig.json` extending the root — this is required for VSCode to pick up errors inline
- `verbatimModuleSyntax` is enabled — use `import type` for type-only imports
- `module: preserve` + `moduleResolution: Bundler` — always use `.js` extensions in relative imports even for `.ts` source files


<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax


<!-- nx configuration end-->
