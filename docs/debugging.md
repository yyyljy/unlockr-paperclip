# Debugging

## Common Commands

```bash
npm run dev
npm run worker:dev
npm run check
curl -s http://localhost:3000/api/health | jq
```

## Failure Modes

### `/api/health` returns 500

Cause:
- missing or invalid env vars

Check:
- `.env.local`
- `docker compose ps`

### Sessions stay in `queued`

Cause:
- worker is not running
- Redis is unavailable

Check:

```bash
npm run worker:dev
docker compose logs redis
```

### Sessions move to `failed`

Cause:
- queue enqueue failure
- worker exception
- storage failure before queue submission

Check:
- terminal output from `npm run worker:dev`
- `latestErrorCode` and `latestErrorMessage` on `/sessions` or the session
  detail page

### Profile is missing on the session page

Cause:
- the worker failed between `parsed_documents` persistence and profile persistence
- the new `candidate_profiles` migration was not applied
- extraction heuristics produced an empty or invalid payload

Check:

```bash
npm run db:migrate
```

- `candidate_profiles` contains a row for the session
- `parsed_documents` exists for the same session
- worker output includes the session id and no post-parse exception

### File upload returns `parser_failure`

This is no longer the default path. Check:

- the uploaded object exists in MinIO
- `resume_uploads.storage_key` matches the object key
- `parsed_documents` was created for the session
- `latestErrorCode` is `empty_document` or `storage_error`

Common causes:

- the PDF is image-only and has almost no extractable text
- the DOCX export is malformed
- the worker could not read the stored object

### Pasted text returns `insufficient_evidence`

This is also expected when the text is too short or lacks role-specific signals.
Paste responsibilities, tools, domains, and measurable outcomes. The session
detail page should now offer an in-product recovery form so you can append that
missing context and re-run analysis without starting from `/`.

### Recovery form does not start a new session

Cause:
- the source session is no longer in `insufficient_evidence`
- the source session is no longer in `parser_failure`
- the recovery migration was not applied
- the original session is missing reusable source text
- the API payload was empty, too short, or missing the replacement file

Check:

```bash
npm run db:migrate
```

- the browser request to `/api/sessions/:id/recover` returned `200`
- `analysis_sessions.retried_from_analysis_session_id` exists for the new row
- the new recovery session appears on `/sessions` with a recovery badge
- the recovery session detail page links back to the original session
- `parsed_documents` still exists for the original insufficient-evidence
  session when the source was a file upload
- the replacement file stays within the PDF, DOCX, or TXT allowlist and 8MB
  limit when recovering from `parser_failure`
- pasted parser-failure recovery text contains enough content to pass intake
  validation

### Feedback does not save on the session page

Cause:
- the session is not in a feedback-eligible terminal state yet
- the `feedback_events` migration was not applied
- the API payload was invalid or exceeded the note length limit

Check:

```bash
npm run db:migrate
```

- the session is `ready`, `insufficient_evidence`, or `parser_failure`
- `feedback_events` contains a row for the session after submit
- the browser request to `/api/sessions/:id/feedback` returned `200`
- the note stays within 500 characters

### `/sessions` does not show the run you expect

Cause:
- the session has not been created successfully yet
- the page only lists the 25 most recently updated sessions
- the health snapshot and attention queue use that same 25-session window
- the app process is stale after a code or schema change

Check:
- refresh `/sessions` after the worker finishes updating the session
- confirm the session appears in either the attention queue or the full recent
  list, depending on its latest status
- open the direct session detail page if you already have the id
- restart `npm run dev` if the route is serving stale server-rendered data

### Recommendations look weak despite a successful run

Check the candidate profile before changing recommendation logic:

- role history snippets were actually extracted
- skills and domain signals are present
- coverage notes call out missing achievements or weak section detection
- recommendation evidence lines up with the stored profile evidence

### Sessions keep showing `Fallback rules`

Cause:
- `CODEX_RECOMMENDATION_ENABLED=true` but the host machine does not have a
  working `codex` CLI install or login
- the codex-local adapter timed out or the CLI returned invalid JSON
- `OPENAI_API_KEY` is missing
- `OPENAI_RECOMMENDATION_MODEL` or
  `OPENAI_RECOMMENDATION_PROMPT_VERSION` is missing
- the OpenAI request timed out or returned a non-JSON / invalid JSON payload
- the model picked evidence keys that do not resolve to stored profile evidence

Check:
- the session detail page badge and debug panel for `Recommendation path`
- worker logs for `codex-local recommendation adapter failed` or
  `OpenAI recommendation adapter failed`
- run `codex exec --help` on the worker host to confirm the CLI binary is
  installed and reachable from the worker process
- `npm run verify:model-path`
- `.env.local` contains the codex-local and/or OpenAI vars on both the web app
  and worker process

## Useful Inspection Points

- `src/lib/analysis-sessions.ts`: queueing, persistence, and session state changes
- `src/lib/candidate-profile.ts`: profile extraction heuristics and evidence mapping
- `src/lib/model-backed-recommendations.ts`: codex-local/OpenAI adapters, JSON
  validation, and evidence-key resolution
- `src/lib/recommendation-engine.ts`: model-first orchestration with safe
  fallback
- `src/lib/resume-intake.ts`: parsing, section detection, and quality flags
- `src/lib/rule-engine.ts`: deterministic recommendation logic
- `src/lib/contracts/recommendations.ts`: user-visible output contract
- `scripts/worker.ts`: background execution path

## Database Inspection

```bash
npm run db:studio
```

Use `/sessions` first for operator triage, then fall back to Drizzle Studio only
when the product surface is insufficient.

Start with:
- `analysis_sessions`
- `analysis_runs`
- `parsed_documents`
- `candidate_profiles`
- `career_recommendation_sets`
- `career_recommendations`
- `recommendation_evidence`
- `feedback_events`
- `analysis_sessions.retried_from_analysis_session_id`
