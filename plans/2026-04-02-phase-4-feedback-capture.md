# Phase 4 Feedback Capture

Date: 2026-04-02
Owner: Founding Engineer
Parent issue: [UNL-11](/UNL/issues/UNL-11)

## Goal

Add the narrowest possible learning loop to the live recommendation flow so Unlockr can capture whether a session's output felt useful before go-to-market work expands.

## Current Baseline

- [UNL-15](/UNL/issues/UNL-15) completed the structured candidate-profile layer and evidence mapping.
- The app already supports end-to-end intake, queue processing, persisted sessions, candidate profiles, and recommendation rendering.
- The current schema and session UI do not persist user feedback about whether the recommendation output was actually useful.
- Without feedback capture, the team cannot distinguish "pipeline works" from "users trust the output enough to act."

## Decision

Keep the next phase extremely narrow: capture basic recommendation usefulness feedback at the session level.

Do not expand into dashboards, auth, recruiter workflows, or broad analytics yet. First, make sure every completed session can collect a simple product-learning signal.

## Scope

1. Define and migrate a minimal `feedback_events` persistence model tied to an analysis session.
2. Add a small server endpoint for submitting session feedback after a terminal result is available.
3. Add a compact session-page UI for `helpful` / `not_helpful` feedback, with an optional short note.
4. Prevent duplicate noisy submissions enough for MVP use, such as one latest feedback state per session or clear replacement rules.
5. Show the saved feedback state back on the session page so operators can verify it without direct database inspection.
6. Update setup, debugging, release, and incident docs anywhere the feedback stage changes operator workflow.

## Minimum Feedback Shape

- session id
- sentiment: `helpful` or `not_helpful`
- optional free-text note
- created timestamp
- updated timestamp if the same session feedback is revised

## Out Of Scope

- analytics dashboards or aggregate reporting
- auth or user accounts
- multi-rater review workflows
- email or webhook notifications
- changing recommendation scoring logic
- new hiring requests

## Done When

- a terminal session can save `helpful` or `not_helpful` feedback through the product surface
- the feedback record is persisted and linked to the analysis session
- the session page reflects the saved feedback state after submission or refresh
- docs explain how to verify the feedback path and what to inspect when it fails
- any notable MVP limitations are called out explicitly
