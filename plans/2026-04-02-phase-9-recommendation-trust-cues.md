# Phase 9 Recommendation Trust Cues

Date: 2026-04-02
Owner: Founding Engineer
Parent issue: [UNL-11](/UNL/issues/UNL-11)

## Goal

Expose the trust and actionability fields that already exist in Unlockr's `ready`
recommendation contract so a real user can judge recommendation strength and see
what is missing before acting on the output.

## Current Baseline

- Phase 8 completed the operator health snapshot at `/sessions`.
- The `ready` recommendation contract already includes `summary.evidenceQuality`,
  per-recommendation `confidence.explanation`, `gaps[]`, and `risks[]`.
- The current session result UI renders the headline, fit summary, confidence
  label/score, evidence snippets, and next steps, but it does not show the
  contract's trust-limiting fields.
- `docs/recommendation-contract.md` explicitly says the UI should show the
  confidence explanation next to the recommendation instead of hiding it.

## Decision

Keep the next lane narrow and user-facing. Do not change the recommendation
schema, ranking logic, or model behavior. First, surface the existing trust cues
already produced by the pipeline.

## Scope

1. Show the ready-state `summary.evidenceQuality` prominently in the session
   result summary with clear user-facing copy.
2. Render each recommendation's `confidence.explanation` near the visible
   confidence label and score.
3. Add compact UI sections for recommendation `gaps[]` and `risks[]` so the user
   can see what is missing or uncertain before acting.
4. Preserve the current recommendation contract and session-detail structure;
   this lane is presentation and trust-readability work, not a schema change.
5. Update any product docs or verification notes that describe what operators or
   reviewers should expect on a completed `ready` session.

## Out Of Scope

- changing taxonomy, ranking, or scoring logic
- redesigning the entire session page
- auth, recruiter workflows, dashboards, or notifications
- new parser or recovery work
- new hiring requests

## Done When

- a `ready` session clearly communicates whether evidence quality is strong,
  mixed, or thin
- every rendered recommendation shows why its confidence is high, medium, or low
- the user can see visible gaps and risks for each recommendation without
  opening debug surfaces or reading raw JSON
- the contract shape remains unchanged
- `npm run check` passes
