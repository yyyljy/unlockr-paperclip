# Phase 6 Insufficient-Evidence Recovery

Date: 2026-04-02
Owner: Founding Engineer
Parent issue: [UNL-11](/UNL/issues/UNL-11)

## Goal

Turn `insufficient_evidence` from a dead-end status into a recoverable product path so a real user can add the missing context and trigger a fresh analysis without starting blind from the home page.

## Current Baseline

- Unlockr already supports intake, parsing, candidate-profile extraction, recommendation rendering, feedback capture, and operator review of recent sessions.
- The session detail page already explains why an analysis ended in `insufficient_evidence` and shows follow-up questions.
- There is no in-product recovery path after that state. A user must manually restart from `/`, reconstruct the missing context themselves, and hope the second attempt is better.
- That makes weak-but-real leads expensive to recover and limits product learning, because the system can identify what is missing but cannot yet capture the follow-up answer in the product flow.

## Decision

Keep the next lane narrow and user-facing. Build the smallest possible recovery loop for `insufficient_evidence` before adding broader analytics, auth, or more internal tooling.

## Scope

1. Add a minimal action on the `insufficient_evidence` session page that lets the user provide clarifying follow-up context.
2. Reuse the prior session input where possible and create a fresh analysis session that appends or combines the added clarification with the earlier usable text.
3. Preserve enough lineage for manual review so operators can tell the new session was retried from a prior `insufficient_evidence` result.
4. Redirect the user into the new analysis session so the recovery loop stays inside the product rather than sending them back to a blank intake.
5. Update setup, debugging, release, and incident docs anywhere the new recovery loop changes verification or triage.

## Out Of Scope

- parser-failure retry UX or file re-upload redesign
- auth, saved user history, or multi-session account management
- broader dashboards, filters, or analytics
- recommendation scoring or model-behavior changes
- new hiring requests

## Done When

- an `insufficient_evidence` session offers a visible in-product recovery action
- submitting clarifying context creates a fresh analysis session instead of leaving the user at a dead end
- the new session can be tied back to the earlier insufficient-evidence attempt during operator review
- docs explain how to trigger, verify, and troubleshoot the recovery loop
