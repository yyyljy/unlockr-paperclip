# Recommendation Contract

## Goal

Define the exact user-facing recommendation payload before polishing the
presentation layer.

## Output States

The contract is a discriminated union on `status`.

### `ready`

Use when the system has enough evidence to recommend 1 to 5 role directions.

Required sections:

- `metadata`
- `summary`
- `recommendations[]`

Each recommendation contains:

- `roleFamily`
- `roleTitle`
- `targetDomains[]`
- `confidence`
- `detectedExperience[]`
- `inferredPotential[]`
- `rationale`
- `evidence[]`
- `nextSteps[]`
- `gaps[]`
- `risks[]`

### `insufficient_evidence`

Use when the input is real but under-specified.

Required sections:

- `metadata`
- `blockingFindings[]`
- `partialSignals[]`
- `followUpQuestions[]`
- `userMessage`

This state exists to prevent polished hallucinations from thin inputs.

### `parser_failure`

Use when the intake pipeline accepted a file but parsing could not produce
trusted text.

Required sections:

- `metadata`
- `errorCode`
- `retryable`
- `requiredAction`
- `userMessage`

## Metadata Rules

Every state includes:

- `contractVersion`
- `taxonomyVersion`
- `generatedAt`
- `parser.provider`
- `parser.version`
- `parser.mode`
- `parser.extractedAt`
- `model.provider`
- `model.version`
- `model.promptVersion`

`model` may be `null` when no model was used, such as parser-failure
outputs.

## Evidence Rules

Every `ready` recommendation must contain at least one evidence object with:

- `snippet`
- `sectionLabel`
- `reason`
- `sourceKind`
- optional offsets for reproducibility

Recommendations without evidence should not reach the UI.

## Confidence Rules

Confidence is represented as:

- `label`: `high`, `medium`, `low`, or `insufficient`
- `score`: `0..1`
- `explanation`

The UI should show the confidence explanation next to the recommendation, not
hide it in debug-only surfaces.

## Ready-State Presentation Rules

- Surface `summary.evidenceQuality` in the ready-session summary so a reviewer
  can immediately tell whether the recommendation strength is strong, mixed, or
  thin.
- Show each recommendation's confidence explanation alongside the visible
  confidence label and score.
- Render `gaps[]` and `risks[]` as visible guidance in the main session UI, not
  hidden raw JSON or debug-only data.

## Phase 1 Notes

- Pasted text and file uploads share the same deterministic recommendation path
  after normalization.
- File uploads should only terminate in `parser_failure` when extraction cannot
  produce usable text.
- The source-of-truth schema lives in `src/lib/contracts/recommendations.ts`.
