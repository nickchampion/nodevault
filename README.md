# NodeVault

[www.nodevault.cloud](https://www.nodevault.cloud)

NodeVault is a personal knowledge vault: drop in files, submit URLs, or point it at an RSS feed, and it turns them into a searchable, private knowledge base you can ask questions of — grounded answers with citations back to your own documents, plus standing alerts when newly-ingested content matches something you care about. Content is ingested through durable background workflows — chunked, embedded, and stored as vectors in Postgres — so retrieval works by *meaning*, not just keywords.

**How it works today:**

1. Sign in with a magic link (no passwords) — email delivery via Resend
2. Create a **vault** and add content: upload a file, submit a URL, or point it at an **RSS feed** for ongoing ingestion
3. An **Inngest workflow** picks the content up asynchronously: extracts text (PDF via `unpdf`, DOCX via `mammoth`, articles via `@mozilla/readability`), chunks it, generates embeddings (Gemini or OpenAI, per account), and writes vectors to **pgvector**
4. Search the vault with **hybrid retrieval** — Reciprocal Rank Fusion over vector similarity and Postgres full-text search
5. **Ask your vault** questions in a streamed, cited conversation — either a hand-rolled RAG pipeline or fully managed grounding via Vertex AI Search / OpenAI file search
6. Save a **topic** and get emailed the moment newly-ingested content matches it — no polling, it rides the same ingestion pipeline every asset already goes through

## Capabilities

What started as a roadmap is now the core of the product:

- **Hybrid search** — pgvector cosine similarity and Postgres `ts_rank_cd` full-text search run as independent candidate sets, fused with Reciprocal Rank Fusion (RRF, k=60) in a single chained-CTE Drizzle query. The vector leg doesn't use a fixed similarity cutoff: a chunk only qualifies if it clears the *vault's own* mean + 1.5×stddev, since a fixed threshold like 0.5 lets unrelated chunks through in some vaults and starves results in others.
- **Q&A with citations** — streamed over Server-Sent Events, with two selectable modes per account:
  - *Local*: a hand-rolled RAG pipeline — follow-up questions are condensed into standalone queries against conversation history, the top-8 chunks come from the same hybrid search used by the UI, and the model is asked to cite sources inline (`[1]`, `[2]`).
  - *Managed*: retrieval is handed off entirely to the provider's own grounding — Vertex AI Search for Gemini accounts, OpenAI `file_search` over a vector store otherwise — letting the model issue its own retrieval queries mid-conversation instead of one upfront fetch. Citations are reconstructed afterward from grounding metadata and resolved back to the source asset.
  - Conversations and per-message citations are persisted, so a vault's Q&A history is itself browsable.
- **Saved topics & alerts** — save a free-text topic, it's embedded asynchronously, and every asset ingestion runs a final match step against every account topic. Idempotency is enforced structurally (a unique index on `(topicId, assetId)` + `onConflictDoNothing`) rather than in application logic, so a topic alerts at most once per asset no matter how many retries or qualifying chunks are involved. Matches batch into a single email per user via a React Email template.
- **RSS feed vaults** — create a vault directly from a feed URL; a weekly Inngest cron fans out one sync per RSS-backed vault, throttled and deduped against existing asset URLs, feeding new items through the exact same ingestion pipeline as a manually-submitted URL.
- **Multi-provider AI, with live migration** — Gemini and OpenAI sit behind one `AiClient` interface (embeddings, streaming answers, managed grounding, index mirroring), selectable per account. OpenAI's embeddings are truncated to 768 dimensions (Matryoshka representation learning) to match Gemini's, so both providers share one `pgvector` column with zero schema changes. Switching provider triggers a concurrency-limited background workflow that re-embeds and re-indexes every asset and topic before cutting over — with an account-level flag gating AI access mid-migration so answers never generate against a half-migrated index.
- **Bring-your-own-cloud grounding** — the Vertex AI Search data store is provisioned per account in the user's *own* GCP project, not a shared platform index, with an explicit verification step that turns "API not enabled" / "no permission" / "store missing" into actionable setup errors instead of opaque failures.
- **SSRF-safe ingestion** — every outbound fetch triggered by user input (RSS feeds, submitted URLs) is checked against `assertPublicHttpUrl` before it hits the network.

**Not yet built:** per-vault synthesis/digests ("what do my saved articles say about X"), and an MCP server exposing vault retrieval to external AI tools.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 (App Router) · React 19 · HeroUI v3 · Tailwind CSS 4 |
| API | Node.js · Koa · **tRPC v11** · zod contracts · Server-Sent Events for streamed Q&A |
| Background jobs | **Inngest** — durable, step-based workflows (including cron polling) |
| Database | Postgres (Neon in prod) · Drizzle ORM · **pgvector** |
| AI providers | Google Gemini (`@google/genai`) and OpenAI (`openai`), selectable per account, behind a shared provider interface |
| Managed grounding | Google Vertex AI Search (`@google-cloud/discoveryengine`) · OpenAI `file_search` vector stores |
| Content extraction | `unpdf` (PDF) · `mammoth` (DOCX) · `@mozilla/readability` + `jsdom` (articles) · `rss-parser` (feeds) |
| Email | Resend · React Email templates |
| Hosting | Frontend on Cloudflare Workers (OpenNext) · API on Fly.io · file storage on R2 |
| Tooling | NX monorepo · pnpm · TypeScript · Vitest · tsx |

### tRPC — end-to-end type safety, no codegen

The API is a tRPC router hosted on Koa, but business logic lives in plain **ApiHandlers** that declare their contract types as generics:

```typescript
export const authLogin: ApiHandler<LoginRequest, OkResponse> = async (context) => {
  const body = context.event.payload  // typed & zod-validated
  // ...
  return context.event.response.ok(authTokens)  // checked against the response contract
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
await api.vaults.create.mutate({ name })
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
  api/          Koa + tRPC API server (routes/ per domain), SSE ask/ pipeline, Inngest functions
  nodevault/    Next.js 15 frontend (Cloudflare Workers via OpenNext)
components/
  api/          Koa host for tRPC, router/procedure helpers, execute() bridge
  configuration/ Config builder + server config (NODEVAULT env var)
  context/      Context, InboundEvent, Response, Session, structured logging
  nodevault/
    contracts/  Public API contracts — zod schemas + DTO types (client-safe)
    domain/     Drizzle schema + inferred row types, AppError
  postgres/     PgSession unit of work, pool factory, migrations
  utils/        Pure utilities (date, string, math)
  utils-server/ Node-only utilities (crypto, auth tokens, SSRF-safe URL fetching)
integrations/
  cloudflare/    R2 object storage client (uploaded file blobs)
  gemini/        Google Gemini client (embeddings, generation)
  openai/        OpenAI client (embeddings, Responses API, vector stores)
  vertexsearch/  Google Vertex AI Search (Discovery Engine) client
  resend/        Transactional email client
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
