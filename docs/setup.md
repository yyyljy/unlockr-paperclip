# Setup

## Goal

Boot the Unlockr Phase 1 workspace locally with the web app, worker, database,
queue, and object storage all running.

For the first real deploy shape, env mapping, and launch order, use
`docs/first-launch-ops.md`.

## Prerequisites

- Node.js 24.x
- npm 11.x
- Docker Desktop or Docker Engine with Compose

## First-Time Setup

1. Copy the environment template.

```bash
cp .env.example .env.local
```

2. Start local infra.

```bash
docker compose up -d
```

3. Install dependencies and generate the initial migration artifacts.

```bash
npm install
npm run db:generate
```

4. Apply migrations to Postgres.

```bash
npm run db:migrate
```

5. Start the worker in one terminal.

```bash
npm run worker:dev
```

6. Start the app in another terminal.

```bash
npm run dev
```

## Verification

- App: `http://localhost:3000`
- Health probe: `http://localhost:3000/api/health`
- Recent session review: `http://localhost:3000/sessions`
- MinIO console: `http://localhost:9001`
- A pasted-text session should progress from `queued` -> `analyzing` -> `ready`
  or `insufficient_evidence`.
- A file-upload session should progress from `queued` -> `parsing` ->
  `analyzing` -> `ready` or `insufficient_evidence` when extraction succeeds.
- `/sessions` should start with a health snapshot that summarizes recent ready,
  insufficient-evidence, parser-failure, and failed counts plus a basic recent
  latency read.
- `/sessions` should show the newest session without needing the raw session id,
  including the current status badge, attention queue membership when relevant,
  and whether feedback was saved.
- Both pasted-text and file-upload sessions should show a candidate profile on
  the session detail page before or alongside the final recommendation payload.
- An `insufficient_evidence` session should show a recovery form that accepts
  clarifying follow-up context and redirects into a fresh session after submit.
- A `parser_failure` session should show a recovery form that lets the user
  upload a replacement file or paste cleaned resume text, then redirects into a
  fresh linked session after submit.
- Ready, insufficient-evidence, and parser-failure session pages should allow a
  `helpful` or `not_helpful` feedback submission with an optional note.
- Refreshing `/sessions` after feedback submission should show the saved
  feedback state without direct database inspection.
- `parser_failure` should now occur only for real extraction problems such as an
  empty document, unreadable file, or storage/read failure.

## Environment Notes

- `DATABASE_URL`: Postgres system of record for sessions, runs, and outputs
- `REDIS_URL`: BullMQ backing queue
- `S3_*`: S3-compatible object storage config; local MinIO is the default
- `RECOMMENDATION_*`: version metadata recorded on every output contract
- The canonical first-launch env matrix now lives in `docs/first-launch-ops.md`.

## Phase 2 Verification Notes

- `parsed_documents` should persist normalized source text and section metadata.
- `candidate_profiles` should persist the extracted profile payload and field
  evidence mappings for every session that parses successfully.
- `/sessions` is now the primary operator review surface; start with the health
  snapshot and attention queue, then click into `/sessions/[sessionId]` for
  evidence-level inspection before touching the database directly.
- `feedback_events` should persist one latest feedback row per eligible terminal
  session, replacing the previous sentiment/note on resubmission.
- `analysis_sessions.retried_from_analysis_session_id` should be populated for
  recovery-generated sessions so lineage is visible on `/sessions` and the
  session detail page.
- Parser-failure recoveries should remain distinguishable from
  insufficient-evidence recoveries on `/sessions` and on the session detail
  page.
- The attention queue should surface recent parser failures, hard failures, and
  clarification-required sessions along with their latest issue code and
  created-to-terminal timing.

## Known Phase 1 Limits

- PDF and DOCX extraction quality still depends on document structure and
  whether the source contains real text instead of scanned images.
- Recommendation generation is deterministic and keyword-based, not LLM-backed.
- Feedback capture keeps only the latest session-level state; there is no
  historical audit trail or aggregate analytics yet.
- The operator review page only shows the 25 most recently updated sessions and
  does not include search, filters, auth, or bulk actions yet.
- No auth or user accounts are included yet.
