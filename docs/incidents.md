# Incidents

## Goal

Respond quickly when recommendation trust, intake reliability, or reproducibility
is at risk.

Use `docs/first-launch-ops.md` for the canonical runtime shape, env matrix, and
default rollback order while handling first-launch incidents.

## Severity Guide

- Sev 1: bad recommendations are being served as trustworthy outputs or evidence
  is missing/corrupted
- Sev 2: intake or worker pipeline is down for all users
- Sev 3: non-critical regression with a documented workaround

## First Response

1. Freeze new deploys.
2. Check `/api/health`.
3. Inspect `/sessions`, read the health snapshot and attention queue, then open
   the latest relevant session detail page.
4. Determine whether the issue is in storage, queue, database, or output logic.
5. Escalate to the CEO immediately if user trust is at risk.
6. Pull the matching dependency and process expectations from
   `docs/first-launch-ops.md` before restarting anything.

## Containment

- If recommendation outputs are malformed, stop the worker first.
- If candidate profiles are missing or evidence mappings look corrupted, stop
  the worker before serving more sessions that could damage recommendation
  trust.
- If storage is broken, disable file intake before accepting more uploads.
- If parser failures spike after a deploy, stop or drain the worker before
  serving more upload traffic.
- If Redis is down, hold new intake traffic or return a maintenance response.
- If Postgres is unhealthy, stop both the web app and worker from accepting new
  sessions.

## Evidence to Capture

- failing session id
- whether `/sessions` shows the expected status, attention state, and
  saved-feedback badge
- current health-snapshot counts for ready, insufficient-evidence,
  parser-failure, and failed outcomes
- latest run id and stage
- `latestErrorCode` and `latestErrorMessage`
- whether the session was created from a recovery path and which session it
  retried from
- `parsed_documents.quality_flags`, `parser_warnings`, and stored parser metadata
- `candidate_profiles.payload.coverageNotes` and the missing or malformed field
  evidence entries
- any `feedback_events` row for the affected session and whether the saved state
  matches the session page
- `/api/health` response
- any recent migration or env change

## Recovery

1. Restore the affected dependency.
2. Re-run `/api/health`.
3. Exercise one pasted-text session end-to-end.
4. Confirm `/sessions` shows the new session with the expected terminal state
   and that the health snapshot reflects the recovery state accurately.
5. Confirm the candidate profile and its evidence mappings are visible on the
   session detail page.
6. Confirm the insufficient-evidence and parser-failure recovery forms can
   still create linked follow-up sessions when those lanes are part of the
   affected flow.
7. Confirm contract metadata is still being recorded.
8. Confirm a completed session can still save and display feedback state.
9. Write a short incident note with root cause, containment, and next fix.

If the fastest safe path is rollback rather than forward-fix, use the rollback
order in `docs/first-launch-ops.md`.

## Phase 1 Escalation Rule

If the incident affects recommendation trust, not just availability, escalate to
the CEO immediately before closing the loop.
