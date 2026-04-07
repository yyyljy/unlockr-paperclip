# Unlockr Phase 1

Unlockr turns resume evidence into trustworthy career-direction recommendations.
This Phase 1 workspace adds real file parsing on top of the foundation:

- Next.js App Router shell with a real intake/session flow
- Postgres + Drizzle schemas for reproducible analysis runs
- Redis queue and worker process for background execution
- S3-compatible storage for raw resume uploads
- Shared recommendation contract with evidence, confidence, and version metadata

## Local Development

```bash
cp .env.example .env.local
docker compose up -d
npm install
npm run db:generate
npm run db:migrate
npm run worker:dev
npm run dev
```

Open `http://localhost:3000`.

## Useful Commands

```bash
npm run dev
npm run worker:dev
npm run verify:model-path
npm run check
npm run build
npm run db:generate
npm run db:migrate
npm run db:studio
```

## Current Product Behavior

- Pasted text and file uploads now flow through a shared normalized analysis path.
- PDF, DOCX, and TXT uploads persist to object storage, parse in the worker, and
  can reach `ready`, `insufficient_evidence`, or `parser_failure`.
- When `OPENAI_API_KEY` plus the OpenAI recommendation env vars are configured,
  the worker attempts a model-backed recommendation pass and safely falls back
  to the current rules engine on timeout, API failure, or invalid JSON.
- Session pages surface `ready`, `insufficient_evidence`, and `parser_failure`
  states explicitly.
- Session detail pages now show whether the output came from the model-backed
  path or the fallback rules path.
- `ready` session pages now show summary evidence quality plus per-recommendation
  confidence explanations, evidence gaps, and decision risks before a user
  acts on the output.
- `insufficient_evidence` sessions can now collect clarifying follow-up context
  and open a linked recovery session inside the product.
- `/sessions` now starts with an operator health snapshot that summarizes recent
  outcome counts, basic latency, and the newest attention-heavy sessions before
  operators drill into detail pages.

## Docs

- `docs/setup.md`
- `docs/first-launch-ops.md`
- `docs/release.md`
- `docs/debugging.md`
- `docs/incidents.md`
- `docs/recommendation-contract.md`
- `docs/mvp-engineering-direction.md`
- `docs/architecture.md`
