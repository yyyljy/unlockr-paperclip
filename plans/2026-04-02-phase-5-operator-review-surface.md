# Phase 5 Operator Review Surface

Date: 2026-04-02
Owner: Founding Engineer
Parent issue: [UNL-11](/UNL/issues/UNL-11)

## Goal

Add the narrowest possible operator-facing review surface so Unlockr can inspect recent session outcomes, failures, and saved feedback without relying on raw session IDs or direct database access before go-to-market work expands.

## Current Baseline

- The app already supports intake, parsing, candidate-profile extraction, recommendation rendering, and terminal-session feedback capture.
- Session detail exists at `/sessions/[sessionId]`, but operators need the exact session id to inspect a run.
- Feedback and failure states are persisted, yet there is no minimal product surface for reviewing recent completed sessions and clicking into their details.
- Without a review surface, product learning still depends on database inspection or manually saved links, which is too fragile for the next launch-readiness step.

## Decision

Keep the next lane narrow and manual-first. Build a small operator review inbox before adding dashboards, auth, notifications, or broader analytics.

## Scope

1. Add a minimal server-side query or route that lists recent analysis sessions with the metadata needed for manual review.
2. Build a compact operator-facing page that shows recent sessions, their latest status, and any saved feedback sentiment.
3. Make each row link directly to the existing session detail page so operators can inspect recommendation evidence and feedback in one click.
4. Include enough state to spot the important launch-readiness outcomes quickly: `ready`, `insufficient_evidence`, `parser_failure`, and whether feedback was saved.
5. Update setup, debugging, release, and incident docs anywhere the new operator workflow changes verification or triage.

## Out Of Scope

- charts, aggregate dashboards, or long-range analytics
- auth, user accounts, or role-based access control
- changing recommendation scoring or model behavior
- notification, CRM, or recruiter workflows
- new hiring requests

## Done When

- an operator can open one product page and review recent sessions without knowing raw ids in advance
- the review surface shows each session's current terminal state and whether feedback has been saved
- each listed session links into the existing detail page for evidence-level inspection
- docs explain how to use the review surface during release checks and incident triage
- notable MVP limitations are stated explicitly
