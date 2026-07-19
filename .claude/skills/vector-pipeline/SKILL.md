---
name: vector-pipeline
description: Content vectorisation and semantic search — chunking, Gemini embeddings, pgvector schema/indexes with Drizzle, and similarity search queries. Use when working on ingestion (URL scrape / file upload), embedding generation, the pgvector schema, or the search endpoint.
---

# Vector pipeline (ingest → embed → pgvector → search)

The product flow: user submits a URL or uploads a file → an Inngest workflow fetches/parses the content, chunks it, embeds each chunk with Gemini, and stores chunks + vectors in Postgres (pgvector) → a search endpoint embeds the query and does a cosine-similarity search.

## pgvector setup (one-time, check before assuming it exists)

- The local dev container is `postgres:16-alpine`, which does **not** ship pgvector. The container must be switched to the `pgvector/pgvector:pg16` image (same env/port/volume, name `nodevault-postgres`) before any vector migration will apply. Flag this to the user if it hasn't happened yet.
- The extension is enabled via a custom migration: `pnpm run db:generate --custom --name=enable-pgvector` containing `CREATE EXTENSION IF NOT EXISTS vector;`.

## Schema (Drizzle)

Follow the repo convention: tables in `components/nodevault/domain/models/` (e.g. `content.ts`), camelCase properties → snake_case columns, timestamps as `timestamptz` in `mode: 'date'`. Drizzle has native pgvector support:

```typescript
import { index, pgTable, text, uuid, vector } from 'drizzle-orm/pg-core'

export const contentChunks = pgTable('content_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').notNull().references(() => contentItems.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  text: text('text').notNull(),
  embedding: vector('embedding', { dimensions: 768 }).notNull(),
}, (table) => [
  index('content_chunks_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
])
```

Typical shape: a `content_items` table (source url/file key, title, status `pending|processing|ready|failed`, error message) and a `content_chunks` table as above. Chunks are replaced wholesale on re-index (`delete where item_id = ...` then insert) — keeps re-runs idempotent.

## Embeddings (Gemini)

- Model: `gemini-embedding-001` via the `@google/genai` SDK (needs adding to deps). API key from `serverConfiguration` (add a `gemini` key to the NODEVAULT config shape) — never `process.env` directly and never committed.
- Default output is 3072 dims; request `outputDimensionality: 768` to fit comfortably under pgvector's 2000-dim HNSW index limit. **Vectors at reduced dimensionality are not pre-normalised — normalise them before storing** (divide by L2 norm), otherwise cosine/inner-product results degrade.
- Set `taskType: 'RETRIEVAL_DOCUMENT'` when embedding chunks and `taskType: 'RETRIEVAL_QUERY'` when embedding the search query — asymmetric embedding matters for retrieval quality.
- Free tier is heavily rate-limited (requests/min and /day). Batch multiple chunks per `embedContent` call, embed in Inngest steps with `throttle` configured on the function, and treat 429s as retriable (Inngest's backoff handles them). Verify current limits at https://ai.google.dev/gemini-api/docs/rate-limits rather than hardcoding assumptions.

## Chunking

Start simple: split extracted plain text into ~1000-token (~3–4k char) chunks with ~15% overlap, on paragraph boundaries where possible. Keep the chunker a pure function in `components/utils` territory (or a server-only helper) with unit tests — it's the most testable part of the pipeline. Store `chunkIndex` so results can show neighbouring context.

## Search query

Embed the query (RETRIEVAL_QUERY, normalised, same dims), then:

```typescript
import { cosineDistance, desc, gt, sql } from 'drizzle-orm'

const similarity = sql<number>`1 - (${cosineDistance(contentChunks.embedding, queryEmbedding)})`
const results = await context.session.db
  .select({ id: contentChunks.id, text: contentChunks.text, similarity })
  .from(contentChunks)
  .where(gt(similarity, 0.5))
  .orderBy(desc(similarity))
  .limit(10)
```

Search is a normal read-only tRPC procedure — contract schemas in `components/nodevault/contracts/`, DTO mapping per repo convention (never return the embedding column).

## Source extraction

- **URL scrape**: fetch server-side inside an Inngest step; extract readable text (strip nav/boilerplate). Respect timeouts and content-type checks; store the resolved title. Only fetch user-supplied URLs over http(s) and consider blocking private-network addresses (SSRF).
- **File upload**: client uploads directly via a presigned S3 PUT URL issued by an API handler — the API never proxies file bytes. Prior art exists in git history (`f0277ff`, `apps/vector/src/handlers/documents/create-upload.ts`): validate filename/contentType/size, key as `uploads/<id>/<filename>`, short TTL. The workflow step downloads from S3 and extracts text by content type (start with text/markdown/PDF; reject others with `NonRetriableError`).
