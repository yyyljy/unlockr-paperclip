# Release

## Goal

Ship Phase 1 safely without losing the trust guarantees around recommendation
outputs.

Use `docs/first-launch-ops.md` as the canonical source for first-launch runtime
shape, env mapping, deploy order, smoke checks, and rollback order.

## Pre-Release Checklist

1. Confirm the target env set matches `docs/first-launch-ops.md` and the
   canonical keys in `.env.example`.
2. Run the local quality gate.

```bash
npm run check
npm run build
```

3. Verify migrations are committed and reproducible.

```bash
npm run db:generate
git diff -- drizzle src/lib/db/schema.ts
```

4. Smoke test the three product states:
   - ready from pasted text
   - ready or insufficient evidence from a valid PDF, DOCX, or TXT upload
   - parser failure from a deliberately unreadable or empty upload
5. Smoke test the insufficient-evidence recovery lane by submitting follow-up
   clarification from an `insufficient_evidence` session and confirming a fresh
   session opens.
6. Smoke test the parser-failure recovery lane by starting one retry from a
   replacement file and one retry from pasted text.
7. Inspect `/sessions` and confirm the newest smoke-test runs appear with the
   correct status badges, feedback state, and health-snapshot counts.
8. Confirm the recovery smoke test shows recovery lineage on `/sessions` and on
   the new session detail page.
9. Open one successful session detail page and confirm the candidate profile
   appears with evidence-backed signals before trusting the recommendation
   payload.
10. Submit one `helpful` or `not_helpful` feedback update on a completed session
   and confirm the saved state is reflected back on `/sessions` after refresh.

## Latest Local Verification

Date: 2026-04-02

- Quality gate passed: `npm run check`, `npm run build`, and `npm run db:generate`
  all succeeded.
- Health check passed: `/api/health` returned `ok: true` for database, Redis,
  and object storage.
- Smoke outcomes completed on the live local stack:
  - pasted text reached `ready`
  - valid TXT upload reached `insufficient_evidence`
  - empty TXT upload reached `parser_failure` with `empty_document`
  - insufficient-evidence clarification recovery opened a linked fresh session
    and reached `ready`
  - parser-failure recovery from a replacement file opened a linked fresh
    session and reached `ready`
  - parser-failure recovery from pasted text opened a linked fresh session and
    reached `ready`
- Operator review verification passed:
  - `/sessions` reflected the smoke runs with `ready: 4`,
    `insufficient_evidence: 1`, and `parser_failure: 1`
  - `/sessions` showed `Clarification recovery`, `Parser recovery`, and saved
    `Helpful` feedback badges
  - the ready-session detail page showed the candidate profile and evidence
    snippets
  - recovery detail pages showed lineage back to the originating sessions
- Workspace note: the `git diff -- drizzle src/lib/db/schema.ts` check could not
  run in this Paperclip workspace snapshot because the directory is not a git
  worktree. `npm run db:generate` reported no schema changes.

## Deploy Surface

- Web app: Next.js standalone output
- Worker: `npm run worker`
- Infra: managed Postgres, managed Redis, S3-compatible bucket
- Canonical operator runbook: `docs/first-launch-ops.md`

## Release Order

Follow the ordered runbook in `docs/first-launch-ops.md`.

The minimum release sequence remains:

1. Apply database migrations.
2. Deploy the web app.
3. Deploy or restart the worker.
4. Verify `/api/health`.
5. Run the critical smoke checks from `docs/first-launch-ops.md`.

## Rollback Guidance

- Use the default rollback order in `docs/first-launch-ops.md`.
- If `candidate_profiles` is missing after deploy, stop the worker until the
  migration is applied everywhere.
- If `feedback_events` is missing after deploy, hold the web release before
  asking operators to validate completed sessions.
- If `retried_from_analysis_session_id` is missing after deploy, hold the
  recovery-flow verification before asking operators to trust the new loop.
- If recommendation contract shape changed unexpectedly, stop the worker before
  serving new intake traffic.
- If storage or queue credentials are wrong, hold releases until `/api/health`
  returns green.

## Phase 1 Release Risks

- Parser quality can vary by resume layout and by scanned/image-only PDFs.
- Profile extraction is heuristic, so weak or poorly structured resumes can
  still produce thin coverage notes even when parsing succeeds.
- The deterministic rule engine is a placeholder for trust-shape validation, not
  final recommendation quality.
- Feedback capture is latest-state only, so resubmissions replace the previous
  sentiment and note instead of preserving a full event history.
- `/sessions` is a narrow operator inbox, not a full dashboard: it has no auth,
  no filtering, and only shows the most recently updated runs in both the list
  and the health snapshot.
