# First Launch Go/No-Go Brief

Date: 2026-04-02

Source issues: [UNL-49](/UNL/issues/UNL-49), [UNL-46](/UNL/issues/UNL-46),
[UNL-11](/UNL/issues/UNL-11)

Primary evidence: `docs/release.md`, `docs/first-launch-ops.md`

## Recommendation

Go for a controlled first launch only after the target environment passes the
runbook checks in `docs/first-launch-ops.md`.

Do not treat the product as ready for a broad public launch yet.

## Why This Is a Conditional Go

- The minimum launch surface is now explicit: runtime shape, env matrix, deploy
  order, smoke checks, and rollback order are documented.
- `docs/release.md` records successful local verification across the trust
  surface: `ready`, `insufficient_evidence`, `parser_failure`, both recovery
  lanes, `/sessions`, candidate-profile visibility, and feedback persistence.
- I re-ran the current workspace quality gate on 2026-04-02 and both
  `npm run check` and `npm run build` passed.
- The remaining risk is operational and trust-shaped, not missing feature
  scope.

## What Is Launch-Ready Now

- The first-launch runtime dependencies are clear: web app, worker, Postgres,
  Redis, and S3-compatible object storage.
- The release order and default rollback order are explicit.
- The trust-sensitive manual smoke suite is defined and has local evidence
  behind it.
- Recovery paths for `insufficient_evidence` and `parser_failure` are already
  part of the verification surface.

## What Is Still Manual or Fragile

- The target deployed environment still needs its own green `/api/health` check
  and smoke validation before real traffic.
- Launch operations are manual. A human operator still has to watch `/sessions`
  and execute the smoke and rollback runbook.
- `/sessions` is a narrow operator inbox, not a full dashboard, and it still
  has no auth or filtering.
- Parser quality can vary by resume layout, especially weakly structured or
  scanned inputs.
- Recommendation quality is still driven by a placeholder deterministic ruleset
  rather than a mature learned system.
- There is still no auth, analytics, or notification layer for broader rollout.

## Smallest Safe First-Launch Constraints

- Limit the first launch to a low-volume, manually supervised cohort.
- Do not add public distribution or acquisition pressure until the first cohort
  proves operationally stable.
- Require one named operator to own health checks, smoke checks, and `/sessions`
  monitoring during launch.
- Require a pre-designated rollback owner who can stop intake immediately if a
  trust or data-integrity trigger fires.
- Keep the launch surface exactly as documented. No new scope or team changes
  should be coupled to this release decision.

## Board Launch Conditions

The board should approve launch only if all of the following are true in the
target environment:

1. `/api/health` returns HTTP `200` with `ok: true`, `env.ok: true`, and green
   database, Redis, and storage checks.
2. The worker is consuming the queue and can read from the uploads bucket.
3. The critical smoke suite passes on the deployed environment:
   pasted text, valid upload, deliberate parser failure, operator review
   surface, one successful session detail page, recovery flow coverage, and one
   feedback write.
4. `/sessions` reflects the smoke runs with correct status badges and health
   snapshot counts.
5. At least one successful session detail page shows the candidate profile plus
   evidence-backed recommendation details before anyone relies on the output.

## Immediate Rollback Triggers

Rollback or stop intake immediately if any of the following happens:

- `/api/health` is not fully green
- the worker is not consuming the queue
- the worker cannot read from object storage
- new sessions remain stuck in `queued`, `failed`, or unexpected
  `parser_failure`
- a successful session is missing the candidate profile or evidence-backed
  recommendation details
- recovery flows or feedback writes fail in the deployed environment
- the recommendation contract shape changes unexpectedly

## Bottom Line

Unlockr is ready for a narrow, controlled first launch once the deployed
environment proves the documented runbook. Unlockr is not ready for an
unconstrained public launch. The right next move is to launch small, supervise
closely, and expand only after the first cohort stays healthy under the manual
operating model.
