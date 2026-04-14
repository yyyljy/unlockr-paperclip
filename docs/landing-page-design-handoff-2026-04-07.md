# Unlockr Landing Page Design Handoff

Date: 2026-04-07 15:17 KST
Owner: Product Designer
Source issue: UNL-114
Primary implementation surfaces:

- `src/app/page.tsx`
- `src/components/intake-form.tsx`
- `src/app/globals.css`

## Goal

Redesign the landing page so it reads as a calm, candidate-facing career guidance product instead of an operator or system console.

The page should answer four questions in order:

1. What Unlockr helps me figure out.
2. What kind of answer I will get back.
3. Why I should trust the answer.
4. How to start with low friction.

## Scope

In scope for this task:

- landing page information hierarchy
- hero content and CTA framing
- pre-intake orientation content
- candidate-facing sample result preview
- lightweight role-family exploration strip
- restrained visual refresh for the landing page only

Out of scope for this task:

- redesigning `/sessions`
- redesigning result detail pages
- new backend behavior
- adding navigation, auth, search, or marketing-site sprawl

## Audience

Primary audience:

- Korean-speaking job seekers or career changers who have real experience but do not know which direction best fits their background next

Secondary audience:

- operators or internal reviewers who need the home page to remain functional for intake, but who are not the primary voice target

## UX Direction

Use a Korean-first, reassuring tone with simple wording. The page should feel interpretive and trustworthy, not technical.

Prefer:

- career direction
- why this fits
- what is still unclear
- best next step
- needs more detail

Avoid above the fold:

- session
- analysis path
- recommendation contract
- health check
- operator review

## Visual Direction

Stay within the current warm palette, but soften contrast and make the page lighter overall.

Suggested token direction:

- background: cream
- neutral panels: sand
- trust states: pale sage
- primary action: muted clay
- recovery states: soft rose

Keep the page visually quiet:

- rounded grouped cards
- short text blocks
- one strong primary CTA color
- no dark technical preview block on the home page

## Page Structure

### 1. Hero

Layout:

- two-column layout on desktop
- left: promise, role-family chips, trust cues
- right: intake card
- stack to single column on mobile, with headline first and intake card second

Required content:

- eyebrow
- headline
- supporting sentence
- lightweight role-family chips
- three trust cues

Recommended copy:

- Eyebrow: `Find Your Next Career Direction from Your Resume`
- Headline: `Find a realistic next career direction from the experience you already have`
- Supporting copy: `Upload a resume or profile and Unlockr will organize the most likely role directions, the evidence behind them, what is still missing, and the next action to take.`

Role-family chips:

- Product
- Operations
- Customer Success
- Data
- Design

Trust cues:

- `Only directions with support are shown`
- `If the input is thin, the product asks follow-up questions instead of guessing`
- `The result should lead directly into a next action`

CTA guidance:

- Primary button should scroll to or emphasize the intake form, not send the user to `/sessions`.
- Secondary action can remain low emphasis and operational, but it should sit below the main candidate path.

Recommended CTA labels:

- Primary: `Start with My Resume`
- Secondary: `View Recent Results`

### 2. Orientation Band

Place a compact orientation strip above the source selector inside the intake column or directly above the full intake card.

Purpose:

- reduce anxiety before users commit to an input method
- explain what improves accuracy
- clarify what happens when evidence is weak

Content blocks:

- `Estimated time`: `Most first-pass results arrive in about a minute`
- `Accepted input`: `Resume text, PDF, DOCX, TXT`
- `What improves accuracy`: `Scope of work, tools used, industry context, measurable outcomes`
- `If details are thin`: `Show follow-up questions before forcing a recommendation`

### 3. Sample Result Preview

Replace the raw contract/code preview with a candidate-facing example result card stack.

This section should visually show the output mental model:

- top direction
- why this fits
- evidence strength
- what is still unclear
- one next step

Recommended structure:

- top badge: `Sample Result`
- lead card title: `Most Likely Direction`
- primary path card
- two smaller alternate path cards
- short evidence and next-step treatment inside the main card

Recommended example content:

- Top direction: `Operations-Focused Product Manager`
- Why this fits: `The resume repeatedly shows process design, cross-functional alignment, and operating metric ownership.`
- Evidence strength label: `Strong Evidence`
- Still unclear: `Product strategy prioritization still needs more explicit confirmation.`
- Next step: `Add one line to the last two projects clarifying decision-making ownership.`

Alternate cards:

- `Customer Success Operations`
- `Service Operations Planning`

### 4. Trust Section

Keep trust proof on the page, but simplify it into three short cards with stronger hierarchy.

Recommended headings:

- `Show why this direction was recommended`
- `Keep uncertain areas visible`
- `Connect the result directly to the next action`

This section should sit below the hero if the sample result preview is integrated into the hero zone, or directly beside it if the layout supports it.

### 5. Intake Card Adjustments

Do not redesign the intake flow architecture. Keep the current two-step structure.

Change only:

- rename the card header away from "Start a session"
- reduce helper copy density
- add the orientation band
- make the two source choices easier to compare at a glance

Recommended header copy:

- Eyebrow: `Start Here`
- Title: `Send the resume you want Unlockr to read`
- Body: `Use whatever version you already have. Missing detail can be added later from the result screen.`

Source option copy:

- `Paste text`
  - Benefit: `The fastest way to see a result`
  - Support: `Analyze copied resume or profile text right away`
- `Upload file`
  - Benefit: `Review the original resume file`
  - Support: `Extract text from PDF, DOCX, and TXT and analyze it through the same flow`

Reduce or remove language that asks the user to understand the system pipeline.

## Responsive Rules

Desktop:

- keep the intake visible above the fold
- keep headline width narrow enough to preserve rhythm
- keep sample result preview readable without horizontal scrolling

Mobile:

- stack headline, chips, trust cues, then intake
- chips should wrap cleanly to two lines if needed
- sample result preview should become a vertical card stack
- avoid side-by-side dense cards below 390px width

## Implementation Notes

For `src/app/page.tsx`:

- keep the overall two-column hero composition
- remove the contract preview concept entirely
- replace it with a visually realistic result preview
- move `/sessions` from primary hero CTA to secondary support action
- add role-family chips near the headline

For `src/components/intake-form.tsx`:

- keep the existing validation and submit behavior
- add one compact orientation strip before `Step 1`
- shorten the source option copy to one benefit line plus one support line
- rewrite section headers and helper text into Korean-first candidate-facing language

For `src/app/globals.css`:

- do not replace the palette system
- extend it with one trust tint and one recovery tint only if needed
- reduce reliance on high-contrast dark surfaces on the landing page

## Acceptance Criteria

The implementation is ready for design QA when:

- the first screen no longer exposes `session`, `recommendation contract`, or `health check` as primary framing
- the main CTA is candidate-facing and tied to intake
- the page includes a lightweight role-family exploration strip
- the raw technical preview is replaced by a candidate-facing sample outcome
- the intake still works with no backend changes
- the page remains calm, readable, and clearly scannable on mobile

## Handoff Notes For Engineering

- Keep this task scoped to the landing page surfaces listed above.
- Do not expand into a full marketing site.
- Do not redesign results pages as part of this implementation issue.
- If tradeoffs are needed, prioritize clarity of the hero and sample result preview over decorative polish.
