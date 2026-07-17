Hybrid search: combine cosine similarity with Postgres full-text (tsvector) in one query using reciprocal rank fusion. This is the single biggest retrieval-quality win available — pure semantic search is notoriously bad at exact names, codes, and acronyms, which is precisely what people search their own documents for.

Filtered vector search in one WHERE clause: scope by vault, account, date, content type, ingestion status — transactionally consistent with the row data, no sync problem.

Vectors as analytical data, not just an index: near-duplicate detection at ingest (flag when a new chunk is ~0.95 similar to an existing one), "related documents" via document-centroid similarity, clustering chunks to auto-surface the themes in a vault, nearest-neighbour classification for cheap auto-tagging against a few labelled exemplars.

Search → answers. You're one step from RAG: retrieve top-k chunks, hand them to an LLM, return a grounded answer with citations back to the source file/URL and chunk. "Ask your vault" with clickable sources is a categorically better product than a results list, and your chunkIndex column already supports showing neighbouring context. This is the step that changes what the product is.

Synthesis. Per-vault digests, "what do my 30 saved articles say about X", contradiction surfacing. Same retrieval engine, different prompt shapes.

Standing queries. A saved query embedding + an Inngest step on ingest = "alert me when anything I save matches this topic." Your architecture (durable workflows, events) is unusually well suited to this, and almost nobody in the personal-knowledge space does it.

Vault as an agent substrate. Expose retrieval as an API/MCP server so users' AI tools (Claude, Cursor, whatever) can query their vault. This reframes NodeVault from "a search app" to "your personal knowledge layer that every agent can use" — arguably the strongest long-term positioning, and it's mostly just another read-only procedure.
