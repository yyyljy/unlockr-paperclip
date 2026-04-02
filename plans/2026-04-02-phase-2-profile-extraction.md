# Phase 2 Profile Extraction

Date: 2026-04-02
Owner: Founding Engineer
Source issue: [UNL-15](/UNL/issues/UNL-15)
Parent issue: [UNL-11](/UNL/issues/UNL-11)

## Goal

Insert a structured candidate-profile layer between parsing and recommendations so Unlockr can persist extracted signals, reason over evidence more cleanly, and debug recommendation quality without changing the current user-facing recommendation contract yet.

## Current Baseline

- [UNL-12](/UNL/issues/UNL-12) completed real PDF, DOCX, TXT, and pasted-text intake with shared normalized downstream input.
- `parsed_documents` now stores parser output, section guesses, quality flags, and parser metadata.
- Recommendations still flow directly from normalized document text into the deterministic rule engine.
- The current schema and session UI do not expose a persisted candidate profile or profile-level evidence mapping.

## Decision

Keep the next phase narrow and structural.

Do not expand into UI polish, auth, recruiter workflows, or broad recommendation-model work yet. First, make the extracted profile explicit, inspectable, and reusable.

## Scope

1. Define a structured candidate-profile schema that captures the minimum durable signals needed for recommendations.
2. Extract and persist candidate-profile data plus field-level evidence mappings from the parsed document.
3. Run both upload and pasted-text sessions through that profile step before recommendation output is finalized.
4. Preserve the current recommendation contract at the product surface while adapting internals as needed.
5. Add a minimal debug or session-level visibility surface for the stored profile and extraction evidence.
6. Update setup, debugging, release, and incident docs anywhere the new profile stage changes operator workflow.

## Candidate Profile Minimum Shape

- candidate headline or summary
- role history or role-family signals
- skills and tools
- domain or industry signals
- measurable outcomes or achievement snippets when present
- education or certification signals when present
- extraction confidence or coverage notes for weak or partial fields

## Out Of Scope

- recommendation card redesign
- auth, accounts, or recruiter-facing workflows
- helpful or not-helpful feedback capture
- replacing the current recommendation contract with a new UI payload
- new hiring requests

## Done When

- a candidate-profile record is persisted for both uploaded-file and pasted-text sessions whenever parsing succeeds
- extracted profile fields include evidence mapping back to source text or sections
- the session or debug surface can show the stored profile without digging directly through the database
- existing `ready`, `insufficient_evidence`, and `parser_failure` outputs still behave correctly
- docs explain the new profile stage, verification path, and likely failure modes
- quality or extraction risks are called out explicitly with a concrete follow-up
