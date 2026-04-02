# Phase 11 First Launch Ops Package

## Objective

Make the verified Phase 1 MVP deployable into a first real environment without
adding product scope or automation-heavy detours.

## Why Now

- Phase 10 finished with local release-readiness evidence in `docs/release.md`.
- The current bottleneck is no longer product behavior; it is the lack of a
  concrete first-launch package for a real environment.
- The company needs one operator-ready source of truth for env mapping, deploy
  order, smoke checks, and rollback before asking for a go/no-go decision.

## Scope

- document the minimum runtime shape for first launch:
  - Next.js web app
  - background worker
  - managed Postgres
  - managed Redis
  - S3-compatible object storage
- create a deploy-facing environment matrix that maps each required env var to:
  - purpose
  - example local value source
  - target production/staging equivalent
  - whether it is required for web, worker, or both
- add a first-launch runbook that covers:
  - migration order
  - web deploy/restart
  - worker deploy/restart
  - `/api/health` verification
  - critical smoke checks after deploy
  - rollback order
- update existing docs only where needed so setup, release, and incident
  guidance point to the new launch package instead of forcing operators to infer
  the path

## Guardrails

- no new recommendation logic, schema changes, or UI scope
- no platform-specific automation unless it is the smallest way to express the
  required manual launch shape
- no auth, analytics, dashboard, or hiring work
- keep the output optimized for a human operator preparing the first real launch

## Done When

- an operator can tell exactly what services and env vars are required for first
  launch
- the deploy order and rollback order are explicit and consistent across docs
- the post-deploy smoke checks are explicit and reference the current Phase 10
  verification surface
- the resulting package is concise enough to support a board go/no-go decision
