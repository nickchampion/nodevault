# NodeVault

NodeVault is a personal knowledge vault: drop in files or point it at URLs, and it turns them into a searchable, private knowledge base. Content is ingested through durable background workflows — chunked, embedded, and stored as vectors in Postgres — so you can find things by *meaning*, not just keywords. The goal is a knowledge layer you can ask questions of (grounded answers with citations back to your own documents) and that your AI tools can query on your behalf.

**How it works today:**

1. Sign in with a magic link (no passwords) — email delivery via Resend
2. Create a **vault** and add content: upload a file or submit a URL
3. An **Inngest workflow** picks the file up asynchronously: extracts text (PDF via `unpdf`, DOCX via `mammoth`), chunks it, generates Gemini embeddings, and writes vectors to **pgvector**
4. Search the vault semantically — cosine similarity over chunks, scoped per account/vault in plain SQL

## Roadmap

Retrieval is the engine, not the product — the value is what gets composed on top of the vault. The near-term build list, roughly in order:

- **Hybrid search** — combine similarity with Postgres full-text search in one query. Pure semantic search is notoriously weak on exact names, codes, and acronyms — precisely what people search their own documents for — and because the vectors already live in Postgres this is a single SQL query.
- **Q&A with citations** — retrieve top-n chunks, hand them to an LLM, and return an answer with citations linking back to the source file/URL and chunk. The `chunkIndex` column already supports pulling neighbouring context. This is the step that turns a results list into "ask your vault" — a categorically different product.
- **Synthesis** — per-vault digests, "what do my saved articles say about X".
- **Saved queries** — save a query's embedding, then compare newly ingested chunks against it inside the existing Inngest pipeline: "alert me when anything I save matches this topic." The durable-workflow architecture makes this nearly free.
- **Vault MCP Server** — expose retrieval as an MCP server so AI tools (Claude, Cursor, …) can query your vault directly. This reframes NodeVault from "a search app" to "your personal knowledge layer that every agent can use".

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 (App Router) · React 19 · HeroUI v3 · Tailwind CSS 4 |
| API | Node.js · Koa · **tRPC v11** · zod contracts |
| Background jobs | **Inngest** — durable, step-based workflows |
| Database | Postgres (Neon in prod) · Drizzle ORM · **pgvector** |
| Embeddings | Google Gemini (`@google/genai`) |
| Email | Resend |
| Hosting | Frontend on Cloudflare Workers (OpenNext) · API on Fly.io · file storage on R2 |
| Tooling | NX monorepo · pnpm · TypeScript · Vitest · tsx |

### tRPC — end-to-end type safety, no codegen

The API is a tRPC router hosted on Koa, but business logic lives in plain **ApiHandlers** that declare their contract types as generics:

```typescript
export const authLogin: ApiHandler<LoginRequest, OkResponse> = async (context) => {
  const body = context.event.payload  // typed & zod-validated
  // ...
  return context.event.response.ok()  // checked against the response contract
}
```

Handlers are wired onto procedures via an `execute()` bridge, with every procedure declaring `.input()` **and** `.output()` schemas from the shared contracts package — so requests are validated and responses are verified (and excess fields stripped) at runtime, while a handler whose types disagree with its schemas is a *compile-time* error at the wiring site:

```typescript
export const authRouter = router({
  verify: publicProcedure
    .input(verifyRequestSchema)
    .output(verifyLoginResponseSchema)
    .mutation(execute(authVerify)),
})
```

The frontend imports the router **type only** (`@platform/apps.api`) and gets a fully typed client with zero code generation:

```typescript
await api.vaults.create.mutate({ name })   // typed end-to-end
```

Each mutating request runs inside a single Postgres transaction (unit of work) managed by middleware — handlers never touch transaction code; a thrown error or 4xx response rolls everything back.

### Inngest — durable ingestion pipeline

File processing is too slow and failure-prone for a request/response cycle, so upload endpoints just persist the row and emit an event:

```typescript
await inngest.send({ name: 'files/file.uploaded', data: { fileId } })
```

The workflow (`apps/api/inngest/functions/process-file.ts`) runs as discrete, individually-retried `step.run()` units — fetch/extract text, chunk, embed, store vectors, mark ready. A step that fails retries from that step, not from the beginning, and file status (`pending → processing → ready | failed`) is visible to the frontend via polling. Locally, `pnpm run inngest` gives you a dev UI at http://localhost:8288 showing every run, step, and payload.

### pgvector — vectors live next to your data

Embeddings are stored in the same Postgres schema as everything else (Drizzle `vector` columns + HNSW index). That means vector search composes with ordinary SQL — scoped by account, vault, date, or status in one `WHERE` clause, transactionally consistent, no separate vector database to sync.

## Monorepo Structure

```
apps/
  api/          Koa + tRPC API server (routes/ per domain) + Inngest functions
  nodevault/    Next.js 15 frontend (Cloudflare Workers via OpenNext)
components/
  api/          Koa host for tRPC, router/procedure helpers, execute() bridge
  configuration/ Config builder + server config (NODEVAULT env var)
  context/      Context, InboundEvent, Response, Session, structured logging
  contracts/    Public API contracts — zod schemas + DTO types (client-safe)
  domain/       Drizzle schema + inferred row types, AppError
  postgres/     PgSession unit of work, pool factory, migrations
  utils/        Pure utilities (date, string, math)
  utils-server/ Node-only utilities (crypto, auth tokens)
integrations/
  cloudflare/   R2 object storage client (uploaded file blobs)
  gemini/       Google Gemini client (embeddings)
  resend/       Transactional email client
```

Three strict layers keep the boundaries clean: **storage** (Drizzle rows, server-only) → **mappers** (explicit field picking, `Date` → UTC ISO) → **contracts** (zod DTOs, the only thing the frontend imports).

## Development

```bash
pnpm install

# Local Postgres (pgvector/pgvector:pg18 container)
docker start nodevault-postgres
pnpm run db           # apply migrations

# Separate terminals:
pnpm run api          # API (tsx watch)
pnpm run app          # Next.js frontend on :8001
pnpm run inngest      # Inngest dev server UI on :8288

# Quality
npx vitest            # tests
npx tsc --noEmit      # type check
pnpm run lint         # lint with autofix
```

Migrations: edit the schema in `components/nodevault/domain/models/`, then `pnpm run db:generate --name=<change>` and `pnpm run db`. See `docs/migrations.md`.

### Configuration

Server config comes from the `NODEVAULT` environment variable (base64-encoded JSON); local overrides from the path in `NODEVAULT_OVERRIDES`. Database URL defaults to `postgres://nodevault:nodevault@localhost:5432/nodevault` in dev, `DATABASE_URL` (Neon) in prod.

## Deployment

| App | Platform | Command |
|-----|----------|---------|
| `apps/api` | Fly.io (Docker) | `fly deploy` from `apps/api/` |
| `apps/nodevault` | Cloudflare Workers | `pnpm run app:build` then `wrangler deploy` |
