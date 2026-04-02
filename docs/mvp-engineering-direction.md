# Unlockr MVP Engineering Direction

## 1. Product Goal

Unlockr MVP should help a user upload or paste a resume/self-introduction, analyze that history, and return:

- realistic career direction hypotheses
- recommended job domains or role families
- reasons grounded in the user's prior experience
- concrete next steps such as skills, learning paths, and certifications

The product quality bar is not "interesting AI output." The quality bar is "recommendations a user can trust enough to act on."

## 2. MVP Scope

### In scope

- resume upload: PDF, DOCX, TXT
- direct text input for self-introduction or resume text
- resume parsing and normalization
- career history analysis
- top 3 to 5 career direction recommendations
- recommendation rationale tied to evidence from the source text
- next-step recommendations for each career path
- basic feedback capture: helpful / not helpful

### Out of scope for v1

- full resume builder/editor
- multi-language localization beyond Korean-first copy
- recruiter or company-facing workflows
- auto-apply or job board integrations
- long-running coaching or learning management features

## 3. Recommended Technical Direction

### Frontend

- Next.js with TypeScript
- App Router for web product and API surface consolidation
- Tailwind CSS for fast MVP iteration
- React Hook Form plus Zod for intake validation

Reason:

- fast iteration with one deployable surface
- small-team friendly
- easy path from MVP to production hardening

### Backend

- Next.js route handlers for synchronous API endpoints
- background job worker for parsing and analysis
- provider adapters around OCR/parser and LLM calls

Reason:

- user uploads and analysis orchestration should not block request threads
- AI and parsing vendors will likely change during MVP

### Data and infra

- Postgres as system of record
- Drizzle ORM for explicit schemas and lightweight migrations
- object storage for uploaded files
- Redis-backed queue for parse/analyze jobs

Suggested hosted path for speed:

- Vercel for web app
- managed Postgres
- managed object storage
- Upstash Redis or equivalent

## 4. Core System Components

### 4.1 Intake layer

- file upload endpoint
- text paste form
- upload validation: file type, size, malware-safe constraints
- object storage persistence

### 4.2 Parsing layer

- text extraction from PDF, DOCX, TXT
- section detection: summary, experience, education, projects, skills, certifications
- parsing fallback states when extraction quality is low

### 4.3 Profile normalization layer

- normalize raw text into a structured candidate profile
- capture skills, industries, years of experience, role progression, domain signals, achievements
- preserve evidence snippets for each extracted field

### 4.4 Recommendation engine

- generate candidate-fit hypotheses for role families
- score role/domain recommendations
- attach rationale based on extracted evidence
- generate gap analysis: missing skills, certifications, portfolio needs, study topics

### 4.5 Feedback and quality loop

- store user feedback on recommendation usefulness
- log parser failures, low-confidence runs, and model outputs
- allow later human review dataset creation

## 5. Trust and Product Quality Rules

This is the highest-risk area of the product.

- Never present unsupported recommendations without a clear reason trace.
- Every recommendation should cite evidence from the user's uploaded text.
- Separate "detected experience" from "inferred potential."
- Show confidence or "insufficient information" states when evidence is weak.
- Never invent certifications, domain experience, or seniority.
- Keep raw model outputs internal; present normalized and reviewed output shapes to users.
- Store model version, prompt version, and parser version per run for debugging.

## 6. Initial Data Model

Recommended starting tables:

- `users`
- `analysis_sessions`
- `resume_uploads`
- `resume_text_sources`
- `parsed_documents`
- `candidate_profiles`
- `career_recommendation_sets`
- `career_recommendations`
- `recommendation_evidence`
- `feedback_events`
- `analysis_runs`

Minimum system property:

- one analysis session should always be reproducible from stored source, parser version, model version, and structured output

## 7. Suggested Analysis Pipeline

1. User uploads file or pastes text.
2. System creates an `analysis_session`.
3. Parser extracts raw text and section structure.
4. Normalizer converts text into structured candidate profile JSON.
5. Recommendation engine generates role/domain hypotheses.
6. System validates output shape and confidence thresholds.
7. UI renders top recommendations, rationale, and next-step guidance.
8. User feedback is stored for later tuning.

## 8. Delivery Phases

### Phase 0: foundation

- initialize app, DB, queue, storage, CI
- define structured schemas for profile extraction and recommendations
- write setup and release docs

### Phase 1: intake and parsing

- build upload and text intake UI
- implement file storage and parser worker
- support parser failure and low-quality extraction states

### Phase 2: profile extraction

- generate structured candidate profile
- persist evidence mapping from source text
- add admin/debug visibility for extraction output

### Phase 3: recommendation experience

- generate career direction recommendations
- show rationale and next steps
- add confidence labels and fallback messaging

### Phase 4: quality loop

- helpful / not helpful feedback
- operational dashboards for failures, latency, and cost
- tune prompts, ranking rules, and output quality

## 9. Initial Backlog

### Platform setup

- scaffold Next.js + TypeScript app
- configure Postgres, migrations, object storage, queue
- add env management and deployment setup

### Product implementation

- upload flow
- text intake flow
- document parser service
- candidate profile schema and persistence
- recommendation orchestration service
- results page and recommendation cards
- feedback capture

### Operational docs

- `docs/setup.md`
- `docs/release.md`
- `docs/debugging.md`
- `docs/incidents.md`

## 10. Risks to Surface Early

- parsing quality varies heavily by resume format
- LLM recommendations can sound convincing even when under-evidenced
- Korean resume conventions may require custom parsing rules
- taxonomy for role families and industries can drift without a curated schema
- upload, OCR, and multi-step analysis can create high latency and cost

## 11. Recommended Next Work Items

1. Settle the MVP output contract first: what exact recommendation object the UI will show.
2. Build intake plus parsing before spending time on polished UI.
3. Add evidence-grounding before expanding recommendation breadth.
4. Create operational docs alongside the first implementation, not after launch.
5. Coordinate hiring only after Phase 0 to 1 boundaries are clear.

## 12. Decision Summary

Recommended default path:

- monolithic Next.js application
- Postgres-backed structured system of record
- background jobs for parsing and AI analysis
- provider abstraction around model and parser vendors
- evidence-grounded recommendation UX as a non-negotiable requirement

This keeps early decisions reversible while protecting the part of the product that most directly affects user trust.
