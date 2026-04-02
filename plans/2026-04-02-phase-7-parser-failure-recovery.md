# Phase 7 Plan: Parser-Failure Recovery

## Why this lane exists now

Phase 6 closed the `insufficient_evidence` dead-end by letting users add
clarifying context inside the product. The next launch-readiness bottleneck is
`parser_failure`: when an upload cannot be extracted cleanly, Unlockr currently
shows the failure metadata but still leaves the user at a dead end.

For go-to-market, that is too brittle. A user with a scanned PDF, malformed
DOCX, or weak export should have one narrow recovery path that keeps them inside
the product and preserves operator visibility.

## Goal

Ship the minimum in-product recovery loop for `parser_failure` sessions so a
user can start a fresh analysis attempt without falling back to a blank intake
flow or abandoning the run.

## Scope

- add a recovery action on `parser_failure` session detail pages
- support the narrowest retry inputs needed for MVP:
  - re-upload a replacement file, or
  - paste the resume text directly when extraction is unreliable
- create a fresh analysis session from that recovery action
- preserve lineage so operators can tell the new session came from a prior
  parser-failure attempt
- keep the original failed session visible for debugging and release checks
- update setup, debugging, release, and incident docs where the new loop changes
  operator workflow

## Out of scope

- parser or OCR quality improvements
- broad retry orchestration for non-parser failures
- auth, dashboards, notifications, or bulk operator tooling
- recommendation-model changes unrelated to wiring the recovery path
- automatic extraction fallback vendors or new infrastructure

## Delivery Notes

- Reuse the existing session-detail recovery pattern where it keeps the user in
  context.
- Make the action explicit about what the user should do next: replace the file
  or paste clean text.
- Preserve enough metadata for `/sessions` and the detail page to distinguish
  parser-failure recoveries from insufficient-evidence recoveries.
- Keep validation and UI copy narrow so operators can explain the flow during
  release checks.

## Done When

- a `parser_failure` session offers an in-product next step instead of only
  static failure metadata
- the user can launch a fresh session from that state by re-uploading a file or
  pasting cleaned resume text
- the resulting session keeps visible lineage back to the failed source session
- `/sessions` and the detail page remain usable for manual operator review
- local verification covers the changed flow and `npm run check` passes
