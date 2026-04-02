# Phase 8 Operator Health Snapshot

## Why This Exists

Unlockr now has the core recommendation loop, operator review inbox, feedback capture,
and both recovery paths. The next launch-readiness bottleneck is fast operator health
visibility: one place to see recent session outcomes, problem clusters, and a basic
latency read without querying raw ids or piecing together signals across screens.

## Current Baseline

- `/sessions` is a manual review inbox for recent runs, not a health snapshot.
- `/api/health` reports dependency status for database, Redis, storage, and env,
  but it does not summarize product outcomes.
- The product already stores enough timestamps and session states to produce a
  narrow recent-activity view.
- No auth, alerting, or dashboard platform is justified yet.

## Decision

Keep this lane narrow and manual-first. Add a small operator-facing health surface
that summarizes recent session states, highlights problem sessions, and exposes a
basic latency signal before expanding into broader analytics or operational tooling.

## Scope

1. Add a minimal operator health snapshot surface for recent session activity.
2. Show recent counts by outcome state such as `ready`, `insufficient_evidence`,
   `parser_failure`, and `failed`.
3. Surface recent problem sessions with session id, source type, latest error code,
   and created/completed timing.
4. Show a basic recent latency read using the timestamps already stored in the system.
5. Link the health surface back to the existing operator session review flow.
6. Update operator docs anywhere the new flow changes release, debugging, or incident
   response.

## Guardrails

- no full dashboard or BI stack
- no auth or role redesign
- no notifications or alerting workflow
- no new recommendation-model tuning or ranking work
- no detailed cost-accounting integration unless it already exists in the schema

## Done When

- an operator can open one product surface and understand recent session health
  without querying raw ids
- recent failure and recovery-heavy sessions are visible and drillable into the
  existing detail flow
- a basic latency read exists for recent runs using stored timestamps
- local verification covers the changed flow and `npm run check` passes
