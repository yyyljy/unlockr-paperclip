# Unlockr Design Research

Date: 2026-04-07
Scope: Career-direction and resume-adjacent product patterns that can improve Unlockr's current intake and results experience.

## Current Unlockr Read

Based on the current workspace:

- The home page already has strong trust language around evidence, risks, and next steps, but it still reads more like an operator or system tool than a candidate-facing guidance product.
- The intake flow is structurally clear because it uses explicit steps and source selection, but the amount of copy makes the first decision feel heavier than necessary.
- The results experience is strongest when it surfaces evidence quality, recommendation confidence, and recovery paths. That is a real differentiator and should stay central.
- The product currently exposes internal framing such as "session", "analysis", "recommendation path", and a raw contract preview much earlier than most user-facing career products do.

Relevant code surfaces:

- `src/app/page.tsx`
- `src/components/intake-form.tsx`
- `src/app/sessions/page.tsx`
- `src/components/session-view.tsx`

## Live Reference Scan

Research pass completed on 2026-04-07 using public product pages.

### 1. Teal

Source:
- https://www.tealhq.com/
- https://www.tealhq.com/career-paths/

Observed patterns:

- The value proposition is immediate and outcome-first: build a resume, get more interviews, organize the search.
- The product groups multiple tools into a single career workflow instead of presenting one isolated action.
- The career paths surface offers a broad exploration layer before commitment, with hundreds of roles and a simple "Start Exploring" entry point.

Design takeaway for Unlockr:

- Users need a low-pressure exploration layer before they are asked to submit a resume.
- Unlockr should present "career direction" as a browsable space, not only as the result of an upload.

### 2. Jobscan

Source:
- https://www.jobscan.co/

Observed patterns:

- The interface is organized around one dominant promise: optimize your resume to get more interviews.
- It translates complex analysis into understandable output units such as match reports, missing skills, and next actions.
- It shows a clear ladder from input to diagnosis to improvement.

Design takeaway for Unlockr:

- Unlockr should convert its recommendation logic into a simpler mental model.
- Instead of leading with "session" mechanics, lead with a visible flow such as upload, extract signals, compare directions, act on the best fit.

### 3. LinkedIn Jobs

Source:
- https://www.linkedin.com/jobs/

Observed patterns:

- The landing page starts with familiar job categories immediately, reducing blank-page anxiety.
- It positions jobs, people, learning, and visibility to recruiters as connected parts of one professional journey.
- It helps users orient quickly by showing recognizable role buckets before requiring deeper interaction.

Design takeaway for Unlockr:

- Unlockr should show candidate-friendly direction categories up front, such as product, operations, customer success, data, or design.
- This would help users calibrate what kind of answers they can expect before they submit a resume.

### 4. Welcome to the Jungle

Source:
- https://www.welcometothejungle.com/en

Observed patterns:

- The tone is human and identity-led: "Find your people."
- Company discovery includes culture, team, and context rather than only job listings.
- The product makes the emotional side of career navigation feel legitimate, not secondary.

Design takeaway for Unlockr:

- Unlockr should soften the current system-heavy voice and frame recommendations around fit, momentum, and confidence.
- The experience can stay evidence-based without sounding clinical.

### 5. Indeed Career Guide

Source:
- https://www.indeed.com/career-advice

Observed patterns:

- Navigation is heavily taxonomy-driven, with clear topic and occupation groupings.
- Users can enter through many lightweight content paths before doing anything high-effort.
- The product makes career questions feel searchable and structured.

Design takeaway for Unlockr:

- Unlockr can benefit from a lightweight browse-and-learn layer around direction themes, evidence gaps, and career questions.
- This can improve first-visit comprehension without increasing the complexity of the core recommendation flow.

### 6. roadmap.sh

Source:
- https://roadmap.sh/

Observed patterns:

- The product succeeds by turning career growth into explicit roadmaps rather than abstract advice.
- Role-based path selection is a first-class interaction, not a hidden secondary tool.
- The site makes progress feel navigable because the next steps are grouped into recognizable tracks.

Design takeaway for Unlockr:

- Unlockr's recommendations should feel more like path cards than diagnostic reports.
- Each direction should visibly answer three questions: why this path, what is missing, what to do next.

## What Unlockr Should Keep

- Evidence-backed trust cues are stronger than most reference products and should remain a core differentiator.
- Recovery flows for insufficient evidence and parser failure are valuable because they preserve state instead of dead-ending the user.
- The current warm, restrained visual language is directionally calmer than the sharper, more growth-hack-oriented competitors.

## Main UX Gaps

### 1. The home page explains the machine before it explains the user outcome

Current issue:

- The landing page introduces internal concepts like sessions, recommendation contracts, and health checks too early.
- The dark contract preview block feels more relevant to operators or internal review than to first-time candidates.

Recommendation:

- Replace the technical preview area with a candidate-facing result preview that shows the top direction, fit summary, evidence strength, and one concrete next step.

### 2. The intake asks for commitment before enough orientation

Current issue:

- The current intake is well-structured but still asks the user to choose an input method before showing enough examples of what Unlockr returns.

Recommendation:

- Add a short pre-intake orientation band above the form that explains example roles Unlockr can uncover, what evidence it looks for, how long the first pass takes, and when it will ask follow-up questions instead of guessing.

### 3. The product needs a clearer exploration layer

Current issue:

- Users can only discover directions after submitting material.
- Competitors consistently provide role, topic, or company exploration earlier.

Recommendation:

- Add lightweight role-family chips or a simple browse section on the home page.
- This should not become a large navigation system in Phase 1. A modest set of examples is enough.

### 4. Result pages likely carry too much operator framing near the top

Current issue:

- The product vocabulary leans technical even though the actual value is user guidance.

Recommendation:

- Reorder the detail page so the top area always shows the recommended direction, evidence quality, why this fit exists, and the next action. Keep debug and process metadata below the main decision surface.

### 5. Confidence needs to be visualized as a decision aid, not just a label

Current issue:

- Unlockr already has strong confidence and evidence structures, but they can read like metadata if not shaped into a clearer decision model.

Recommendation:

- Convert confidence into a small visual framework that shows what is well-supported, what is uncertain, what is missing, and what action reduces uncertainty fastest.

## Recommended Near-Term Design Changes

Priority order for the current product:

1. Rework the home page hero and supporting section around outcome, example directions, and trust proof instead of internal system framing.
2. Replace the raw contract preview with a sample recommendation card stack.
3. Add a lightweight exploration strip with role families or example career directions.
4. Simplify intake copy and reduce repeated explanatory text inside the source-selection flow.
5. Restructure session detail pages so decision-making content appears before process metadata.
6. Introduce a calmer pastel extension to the current palette for confidence, evidence, and recovery states.

## Visual Direction Recommendation

Suggested direction:

- Keep the existing restrained warmth, but lighten the contrast range.
- Use softer cream, sand, sage, and muted clay surfaces rather than dense dark panels on the landing page.
- Reserve stronger accent color for primary action and evidence emphasis only.
- Favor clean card groupings, clear headings, and shorter text blocks over large explanatory paragraphs.

This keeps Unlockr differentiated from colder enterprise dashboards and from louder job-search growth products.

## Anti-Patterns To Avoid

- Do not turn the landing page into a multi-tool catalog like a large job-search suite.
- Do not bury the product inside abstract AI language or technical pipeline terminology.
- Do not make the first-run experience depend on users understanding parsing, confidence systems, or recommendation metadata.
- Do not over-darken the interface. The current product category benefits more from calm confidence than from dramatic contrast.

## Summary

Unlockr's strongest design advantage is not breadth. It is trustworthy narrowing.

The best next UI direction is:

- more candidate-facing
- less system-facing
- more explorable before upload
- more decisive after analysis

If followed, that would make the product feel closer to a calm career direction guide and less like an internal analysis console.
