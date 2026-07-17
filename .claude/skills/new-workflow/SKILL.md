---
name: new-workflow
description: End-to-end checklist for adding a user-driven Inngest workflow to this repo — contract, endpoint, event, workflow function, status polling, and frontend wiring. Invoke with /new-workflow <description> when scaffolding a new workflow feature.
---

# Adding a user-driven workflow

Follow this order; each step compiles/tests independently. Load the `inngest` skill (and `vector-pipeline` if the workflow touches embeddings) before writing code.

## 1. Contracts first (`components/contracts/<domain>.ts`)

- Request/response zod schemas for the triggering endpoint (e.g. submit URL / request upload) and the status query. Export inferred types.
- The Inngest event payload schema lives here too — it's shared vocabulary.
- Dates are `z.iso.datetime()`; status enums as `z.enum([...])`.

## 2. Storage (`components/domain/models/`)

- Add/extend tables with a `status` column (`pending | processing | ready | failed`) and an error-detail column.
- `pnpm run db:generate --name=<change>`, review the SQL, `pnpm run db`.

## 3. Trigger endpoint (`apps/api/routes/<domain>/`)

- `ApiHandler<Request, Response>` that validates, inserts the row as `pending`, sends the Inngest event with **ids only**, and returns `created(dto)`.
- Wire into the domain router with `.input()`/`.output()`/`execute()`; merge new domains into `apps/api/router.ts` and `routes/index.ts`.
- Status endpoint: read-only `.query()` returning the status DTO — this is what the frontend polls.

## 4. Workflow function (`apps/api/inngest/`)

- One `createFunction` per workflow, `triggers: [{ event }]`. Split into `step.run` units at side-effect boundaries: mark processing → do the work (fetch/parse/embed/etc.) → persist results → mark ready.
- Wrap the whole body so any failure marks the row `failed` with a message before rethrowing (a final `onFailure` handler on the function is the cleanest place).
- Add the function to the `functions` array in `apps/api/inngest/index.ts` and its event schema to the client's `EventSchemas`.

## 5. Frontend

- Call via `useApiClient()`: mutate to trigger, then poll the status query (simple interval with backoff, stop on `ready | failed`).
- Reuse the contract schema for form validation via `zodValidate()`.
- Note: frontend is currently Nuxt/Vue; a React/Next.js migration is planned but **not started** — build in Vue unless told otherwise.

## 6. Verify end-to-end

- `pnpm run api` + `pnpm run inngest` + `pnpm run nc`, plus `docker start nodevault-postgres`.
- Trigger through the UI or a tRPC call; watch the run in the Dev Server UI (http://localhost:8288); confirm the status transitions and stored data in `pnpm run db:studio`.
- `npx tsc --noEmit` and `npx vitest` before calling it done.
