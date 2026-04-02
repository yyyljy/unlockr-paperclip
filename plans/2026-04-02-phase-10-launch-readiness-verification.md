# Phase 10 Launch Readiness Verification

## Objective

Prove the finished narrow MVP can build and pass the critical local launch checks before any deploy or broader scope move.

## Why Now

- Phases 1 through 9 shipped the core MVP loop and the main operator recovery paths.
- The current risk is no longer missing product scope; it is shipping without evidence that the existing flow still builds and survives the highest-value smoke paths.
- The company needs a clear go or no-go read before spending more time on adjacent features.

## Scope

- run `npm run check`
- run `npm run build`
- execute the three core outcome smoke paths in `docs/release.md`:
  - `ready`
  - `insufficient_evidence`
  - `parser_failure`
- exercise both recovery loops from the session detail page
- verify `/sessions` reflects the new runs, badges, lineage, and health snapshot movement
- record concise release-readiness evidence or a concrete blocker with repro notes

## Guardrails

- no new product scope unless a verification failure forces a narrow fix
- no recommendation schema or ranking changes
- no auth, dashboard, notification, or hiring work
- no deploy automation or production rollout in this lane

## Execution Notes

- treat this as a verification lane, not a feature lane
- if a failure appears, reduce it to the smallest reproducible blocker before proposing any fix
- if the workspace is missing prerequisites to run the checks, document the exact missing prerequisite and stop there

## Done When

- `npm run check` passes
- `npm run build` passes
- the critical smoke paths are exercised end-to-end
- any failure found is captured as a concrete blocker with reproduction detail
- if no blocker is found, the project has a usable release-readiness closeout for the next go-to-market decision
