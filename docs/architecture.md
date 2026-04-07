# Unlockr Current Architecture

## Status Summary

As of this snapshot, Unlockr already has both frontend and backend foundations in place.
This repository is a single Next.js application plus a separate queue worker process:

- Frontend exists and is usable for intake, session review, session detail, feedback, and recovery flows.
- Backend exists inside Next.js route handlers for synchronous requests and a BullMQ worker for async parsing and recommendation work.
- Persistence and infrastructure wiring already exist for Postgres, Redis, and S3-compatible object storage.

The main gap is not "missing FE/BE." The main gap is production hardening and smarter recommendation quality work on top of the current foundation.

## Runtime Shape

### 1. Web app and API surface

The web product and HTTP API live in the same App Router codebase.

- Landing page: `src/app/page.tsx`
- Session list: `src/app/sessions/page.tsx`
- Session detail: `src/app/sessions/[sessionId]/page.tsx`
- Intake UI: `src/components/intake-form.tsx`
- Session result UI: `src/components/session-view.tsx`

Implemented route handlers:

- `src/app/api/intake/route.ts`
- `src/app/api/health/route.ts`
- `src/app/api/sessions/[sessionId]/route.ts`
- `src/app/api/sessions/[sessionId]/feedback/route.ts`
- `src/app/api/sessions/[sessionId]/recover/route.ts`

Interpretation:

- FE and request/response BE are already implemented in one deployable app.
- There is no separate standalone backend service yet, which is acceptable for the current MVP phase.

### 2. Async worker

Heavy analysis work is intentionally moved out of request threads.

- Worker entrypoint: `scripts/worker.ts`
- Queue definition: `src/lib/queues.ts`

Current worker responsibilities:

- load the queued analysis session
- download uploaded resume files from object storage when needed
- parse the source into a normalized document
- extract a structured candidate profile
- generate a recommendation result
- persist terminal output and failure metadata

### 3. Data and storage

The repo already has a real persistence layer.

- Drizzle schema: `src/lib/db/schema.ts`
- DB client: `src/lib/db/client.ts`
- Storage adapter: `src/lib/storage.ts`

Current persisted entities include:

- `analysis_sessions`
- `analysis_runs`
- `resume_uploads`
- `resume_text_sources`
- `parsed_documents`
- `candidate_profiles`
- `career_recommendation_sets`
- `career_recommendations`
- `recommendation_evidence`
- `feedback_events`

This is enough to reproduce a session from source input through stored result metadata.

## Product Flow

### Intake path

1. The user pastes text or uploads a file from the frontend.
2. `POST /api/intake` validates the payload and creates an analysis session.
3. The route writes source records to Postgres, stores uploaded files in S3-compatible storage when needed, and enqueues a BullMQ job.

### Analysis path

1. `scripts/worker.ts` consumes the queue job.
2. `src/lib/resume-intake.ts` parses direct text or uploaded PDF, DOCX, and TXT files into a normalized document.
3. `src/lib/candidate-profile.ts` extracts structured profile signals and evidence snippets.
4. `src/lib/recommendation-engine.ts` attempts the model-backed adapter first,
   preferring codex-local when enabled, then falling back to OpenAI if
   configured, and finally falling back to `src/lib/rule-engine.ts` when no
   model path is available or valid.
5. The worker writes result artifacts back to Postgres.

### Review path

1. Session pages load snapshots from `src/lib/analysis-sessions.ts`.
2. Operators can review outcome states, evidence quality, feedback state, and recovery options.
3. Recovery can start a linked follow-up session for parser failures or insufficient evidence.

## What Is Actually Implemented Today

Implemented now:

- web frontend for intake and review
- synchronous API endpoints for intake, health, session reads, feedback, and recovery
- async queue worker for parsing and recommendation processing
- real database schema and persistence
- object storage for uploaded files
- parser support for PDF, DOCX, and TXT
- explicit `ready`, `insufficient_evidence`, `parser_failure`, and `failed` states
- operator-facing session snapshot and recovery loop

## Important Current Limits

Verified current limits from this repository:

- no auth or user account system is present yet
- no separate CI configuration is present in the repo
- no automated test suite is present in the repo
- recommendation generation now supports codex-local and OpenAI-backed
  adapters, but still depends on fallback heuristics when the model path is
  unavailable or rejected
- the codex-local path depends on host-level CLI installation and persisted
  Codex authentication, so deployment hardening is now partly an operator
  concern instead of being only an app-env concern
- session review is still operator-oriented and limited to recent-session views, with no search, filters, or bulk actions

## Recommendation

For current MVP status reporting, the correct answer is:

- FE exists
- BE exists
- async analysis infrastructure exists
- the next work should focus on quality, trust, provider hardening, and production readiness rather than starting frontend from zero
