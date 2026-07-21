# Retrieval eval harness

A measurement tool for the `local` (pgvector) retrieval path. It replays a set of real
questions through the exact retrieval the ask pipeline uses (`hybridChunkCandidates` — query
embedding + BM25, fused with RRF, with HyDE optional on the vector arm) and scores what comes
back against a hand-labelled gold set.

The point is **A/B measurement**: before you add HyDE, contextual chunks, or a reranker,
record a baseline; after, re-run and compare. Without this, retrieval changes are vibes.

## What it measures

Relevance is labelled at **asset (document)** granularity — you say "question X should be
answered from document 12" — but scored over the ranked list of **chunks**, because chunks are
what fill the answer prompt. `k` (default 8) mirrors `RAG_CHUNK_LIMIT`: the top-k chunk slots
are the real, finite prompt budget.

| metric | question it answers |
| --- | --- |
| **hit rate** | did *any* relevant chunk reach the prompt? If 0, the LLM literally cannot answer. |
| **asset recall@k** | what fraction of the expected documents surfaced in the top-k? |
| **precision@k** | what fraction of the k prompt slots were actually relevant (signal-to-noise)? |
| **MRR** | how high did the *first* relevant chunk rank? |
| **nDCG@k** | overall ranking quality, discounting hits that rank late. |

## Authoring a gold set

Copy `gold.example.json` to `gold.json` (git-ignored) and fill it with your own vault's data:

```json
{
  "k": 8,
  "cases": [
    { "question": "How do I rotate my signing keys?", "vaultId": 1, "relevantAssetIds": [12], "notes": "..." }
  ]
}
```

Find asset ids per vault with `pnpm run db:studio` (browse the `assets` table). Aim for 15–20
cases that reflect *how people actually ask* — especially questions whose wording does **not**
match the source text, since that mismatch is the failure you're chasing.

## Running

Needs the same environment as `pnpm run api` (the `NODEVAULT` config env var, a reachable
Postgres with embedded chunks, and valid AI credentials on the account — embeddings are live
network calls). It does **not** mutate the database.

```bash
pnpm run eval:retrieval                              # uses .platform/utils/eval/gold.json, HyDE per pipeline default
pnpm run eval:retrieval -- --no-hyde                 # baseline: raw question embedding, no HyDE
pnpm run eval:retrieval -- --hyde                    # force HyDE on
pnpm run eval:retrieval -- --gold path/to/set.json   # a different set
pnpm run eval:retrieval -- --k 5 --verbose           # override k; -v lists retrieved chunks (● relevant, ○ noise)
```

### Measuring HyDE

Run the baseline and the treatment back to back and compare the summary blocks:

```bash
pnpm run eval:retrieval -- --no-hyde   # baseline
pnpm run eval:retrieval -- --hyde      # with HyDE
```

### Measuring Contextual Retrieval

Contextual chunks are an *ingestion-time* change, so you compare across a re-ingest rather than
a flag: record the summary, backfill context for the vault (see `recontextualise` below), then
re-run the same gold set.

`--verbose` prints the ranked chunks per case so you can *see why* a question missed — usually
either the right chunk never came back (a retrieval problem HyDE/contextual chunks address) or
the chunk exists but is buried under noise (a ranking problem a reranker addresses).

## The scoring core is unit-tested

`metrics.ts` is pure (no DB, no network) and covered by `metrics.spec.ts` in the normal vitest
suite — so the numbers themselves are trustworthy before you read anything into them.
