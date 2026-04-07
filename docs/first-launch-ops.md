# First Launch Ops Package

## Goal

Provide one operator-facing source of truth for the first real Unlockr launch.
This package covers the minimum runtime shape, the required environment
variables, the deploy order, the critical smoke checks, and the default
rollback order.

## Runtime Shape

Unlockr Phase 1 needs exactly five runtime pieces for first launch:

1. Web app
   - Next.js standalone server built with `npm run build`
   - started with `npm run start`
   - serves intake, session detail pages, `/sessions`, and `/api/health`
   - writes to Postgres, uploads files to object storage, and enqueues jobs in
     Redis-backed BullMQ
2. Worker
   - started with `npm run worker`
   - consumes the `analysis-sessions` queue with concurrency `4`
   - reads uploaded files from object storage
   - writes parsed documents, candidate profiles, runs, and recommendation
     outputs to Postgres
3. Managed Postgres
   - system of record for sessions, runs, parsed documents, candidate profiles,
     recommendations, and feedback
4. Managed Redis
   - BullMQ queue transport between the web app and the worker
5. S3-compatible object storage
   - stores raw resume uploads under `resume-uploads/<sessionId>/...`

Not part of the first launch surface:

- auth or user accounts
- analytics or event pipelines
- notifications
- scheduled jobs or background cron systems
- additional API services beyond the Next.js app and worker

## Environment Matrix

Use [`.env.example`](../.env.example) as the canonical local source. Do not
copy workspace-specific overrides from [`.env.local`](../.env.local) into a
shared staging or production template.

The base runtime variables below are operationally required by both the web app
and the worker because `src/lib/env.ts` validates one shared server schema
before any database, queue, storage, or health-check code runs. The OpenAI
variables are optional unless you are enabling the model-backed recommendation
path for launch.

| Variable | Purpose | Local example source | Target first-launch equivalent | Required by |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Canonical public base URL for links and server-side URL assumptions | `.env.example` -> `http://localhost:3000` | public staging or production app URL | both |
| `DATABASE_URL` | Postgres connection string for Drizzle migrations and app data access | `.env.example` -> local Postgres URL | managed Postgres primary connection URL | both |
| `REDIS_URL` | Redis connection string for BullMQ enqueue and worker consumption | `.env.example` -> local Redis URL | managed Redis connection URL | both |
| `S3_ENDPOINT` | S3 API endpoint for upload, download, and bucket health checks | `.env.example` -> local MinIO endpoint | object-storage API endpoint | both |
| `S3_REGION` | region passed to the S3 client | `.env.example` -> `ap-northeast-2` | bucket region or provider region | both |
| `S3_BUCKET` | bucket name for raw resume objects | `.env.example` -> `unlockr-local` | first-launch uploads bucket | both |
| `S3_ACCESS_KEY_ID` | storage access key | `.env.example` -> local MinIO access key | production or staging storage access key | both |
| `S3_SECRET_ACCESS_KEY` | storage secret key | `.env.example` -> local MinIO secret | production or staging storage secret | both |
| `S3_FORCE_PATH_STYLE` | path-style toggle for the S3 client | `.env.example` -> `true` | usually `false` for managed S3, `true` for MinIO-style targets | both |
| `RECOMMENDATION_CONTRACT_VERSION` | version tag written onto recommendation outputs | `.env.example` -> `v1` | launch contract version label | both |
| `RECOMMENDATION_PARSER_VERSION` | parser version label written into parser metadata | `.env.example` -> `phase1-intake-v1` | current launch parser version label | both |
| `RECOMMENDATION_MODEL_PROVIDER` | provider label recorded on recommendation metadata | `.env.example` -> `unlockr-rules` | current launch provider label | both |
| `RECOMMENDATION_MODEL_VERSION` | model or ruleset version recorded on outputs | `.env.example` -> `rules-2026-04-02` | current launch model or ruleset version | both |
| `RECOMMENDATION_PROMPT_VERSION` | prompt or decision-policy version label | `.env.example` -> `phase1-rules-seed` | current launch prompt or policy version | both |
| `RECOMMENDATION_TAXONOMY_VERSION` | taxonomy version label written onto outputs | `.env.example` -> `2026-04-02` | current launch taxonomy version label | both |
| `OPENAI_API_KEY` | secret used by the model-backed recommendation adapter | `.env.example` -> blank | deploy-time OpenAI secret | both when enabled |
| `OPENAI_BASE_URL` | OpenAI-compatible API base URL | `.env.example` -> `https://api.openai.com/v1` | provider base URL | both when enabled |
| `OPENAI_RECOMMENDATION_MODEL` | model id used for model-backed recommendations | `.env.example` -> blank | launch model id | both when enabled |
| `OPENAI_RECOMMENDATION_PROMPT_VERSION` | prompt version label recorded on model-backed outputs | `.env.example` -> `phase2-openai-v1` | launch model prompt label | both when enabled |
| `OPENAI_RECOMMENDATION_TIMEOUT_MS` | request timeout for the model-backed adapter | `.env.example` -> `20000` | launch timeout budget | both when enabled |

## First Launch Runbook

### 1. Preflight

1. Confirm the five runtime pieces exist: web app target, worker target,
   Postgres, Redis, and an S3-compatible bucket.
2. Confirm the web app and worker receive the same env set from the matrix
   above.
3. Run the quality gate against the exact build you plan to launch.

```bash
npm run check
npm run build
```

4. Confirm the database is reachable from the deploy environment before running
   migrations.

### 2. Apply Migrations

Run migrations once against the target database before starting new app or
worker code.

```bash
npm run db:migrate
```

If the migration step fails, stop the launch and fix the database access or
migration state first.

### 3. Deploy the Web App

1. Ship the built Next.js standalone artifact.
2. Start or restart the web process with `npm run start`.
3. Do not put traffic on the new web process until the health check passes.

### 4. Deploy the Worker

1. Start or restart the worker with `npm run worker`.
2. Confirm the worker logs show `Unlockr worker listening on queue "analysis-sessions"`.
3. Confirm the worker is pointed at the same Postgres, Redis, storage bucket,
   and recommendation-version env values as the web app.

### 5. Verify `/api/health`

Hit the deployed health endpoint immediately after both processes are up.

Expected result:

- HTTP `200`
- `ok: true`
- `env.ok: true`
- `services.database.ok: true`
- `services.redis.ok: true`
- `services.storage.ok: true`

If `/api/health` returns `500` or `503`, stop here and fix the broken
dependency or missing env before accepting real traffic.

### 6. Critical Smoke Checks

Run the smallest manual verification set that still covers the full trust
surface from Phase 10:

1. Pasted-text intake
   - submit one realistic pasted resume
   - confirm it reaches `ready`
2. Valid file upload
   - submit one valid PDF, DOCX, or TXT file
   - confirm it reaches `ready` or `insufficient_evidence`
3. Deliberate parser failure
   - submit one empty or unreadable upload
   - confirm it reaches `parser_failure`
4. Operator review surface
   - open `/sessions`
   - confirm the new smoke runs appear with correct status badges
   - confirm the health snapshot updates
5. Session detail trust surface
   - open one successful session detail page
   - confirm the candidate profile is visible
   - confirm the recommendation path badge is `Model-backed` when the OpenAI
     env is enabled, or `Fallback rules` when it is intentionally disabled
   - confirm recommendation evidence and confidence cues are visible before the
     user would act on the output
6. Recovery surface
   - if the valid upload lands in `insufficient_evidence`, run one
     clarification recovery
   - run one parser-failure recovery from either replacement upload or pasted
     text
   - confirm the new session links back to the originating session
7. Feedback surface
   - submit one `helpful` or `not_helpful` feedback update on a terminal
     session
   - confirm `/sessions` reflects the saved state after refresh

The launch is not ready if `/sessions` is stale, the candidate profile is
missing, or the smoke tests produce malformed recommendation evidence.

## Default Rollback Order

Use this order unless a narrower fix is already obvious:

1. Stop or drain the worker first if recommendation trust or data integrity is
   in doubt.
2. Roll the web app back to the last known good artifact.
3. Roll the worker back to the last known good artifact.
4. Keep the database at the current version unless the migration has an
   explicit, proven rollback path.
5. Re-run `/api/health`.
6. Re-run at least one pasted-text smoke check and verify `/sessions` reflects
   the recovery state.

## Launch-Stopping Conditions

Do not proceed with a real launch if any of the following is true:

- `/api/health` is not fully green
- the worker cannot read from the uploads bucket
- the worker is not consuming the queue
- new sessions stay in `queued`, `failed`, or unexpected `parser_failure`
- successful sessions are missing candidate profiles or evidence-backed
  recommendation details
- the recovery flows or feedback flow fail on the deployed environment
