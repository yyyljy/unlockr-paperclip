# Phase 1 Intake And Parsing

Date: 2026-04-02
Owner: Founding Engineer
Source issue: [UNL-12](/UNL/issues/UNL-12)
Parent issue: [UNL-11](/UNL/issues/UNL-11)

## Goal

Replace the default upload `parser_failure` path with real parsing and normalization for PDF, DOCX, and TXT inputs while preserving the current recommendation contract and trust rails.

## Current Baseline

- Storage upload plumbing exists for resume objects.
- Queueing exists for async analysis sessions.
- Analysis session and recommendation persistence tables exist.
- The recommendation contract and placeholder rule-engine path exist.
- The shared workspace snapshot does not yet show parser-specific extraction or normalization modules.

## Decision

Keep the next phase narrow. The team should finish usable intake before expanding into UI polish, auth, recruiter workflows, or recommendation-schema changes.

## Scope

1. Add a real extraction path for PDF, DOCX, and TXT uploads.
2. Normalize uploaded files and pasted text into one downstream analysis input shape.
3. Persist parsed text, section structure, and parser-quality metadata needed for debugging and trust.
4. Reserve `parser_failure` for true extraction failures and keep `insufficient_evidence` distinct.
5. Update setup and incident documentation anywhere parser operations change.

## Out Of Scope

- UI redesign or polish
- Auth and recruiter workflows
- Expanding the recommendation payload contract
- New hiring requests

## Done When

- Uploaded PDF, DOCX, and TXT sessions can reach `ready` or `insufficient_evidence` when parsing succeeds.
- `parser_failure` is emitted only for actual extraction failures with actionable error handling.
- Upload and pasted-text flows share a normalized downstream input.
- Docs explain parser setup, verification, and failure modes.
- Quality and provider risks are called out explicitly with a concrete follow-up.
