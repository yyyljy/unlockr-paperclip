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

Recommended Korean copy:

- Eyebrow: `이력서 기반 커리어 방향 찾기`
- Headline: `내 경험으로 현실적인 다음 커리어 방향을 찾으세요`
- Supporting copy: `이력서나 자기소개를 올리면 Unlockr가 맞을 가능성이 높은 직무 방향, 그 근거, 아직 부족한 정보, 바로 할 다음 행동까지 정리해 드립니다.`

Role-family chips:

- 프로덕트
- 운영
- 고객성공
- 데이터
- 디자인

Trust cues:

- `근거가 있는 방향만 보여줍니다`
- `정보가 부족하면 추측 대신 추가 질문을 합니다`
- `다음 행동까지 바로 이어집니다`

CTA guidance:

- Primary button should scroll to or emphasize the intake form, not send the user to `/sessions`.
- Secondary action can remain low emphasis and operational, but it should sit below the main candidate path.

Recommended CTA labels:

- Primary: `내 이력서로 시작하기`
- Secondary: `최근 결과 보기`

### 2. Orientation Band

Place a compact orientation strip above the source selector inside the intake column or directly above the full intake card.

Purpose:

- reduce anxiety before users commit to an input method
- explain what improves accuracy
- clarify what happens when evidence is weak

Content blocks:

- `예상 소요 시간`: `첫 결과는 보통 1분 안팎으로 도착합니다`
- `가능한 입력`: `이력서 텍스트, PDF, DOCX, TXT`
- `정확도가 높아지는 정보`: `담당 업무, 사용 도구, 산업 맥락, 수치 성과`
- `정보가 부족할 때`: `억지 추천 대신 보완 질문을 먼저 드립니다`

### 3. Sample Result Preview

Replace the raw contract/code preview with a candidate-facing example result card stack.

This section should visually show the output mental model:

- top direction
- why this fits
- evidence strength
- what is still unclear
- one next step

Recommended structure:

- top badge: `예시 결과`
- lead card title: `가장 가능성 높은 방향`
- primary path card
- two smaller alternate path cards
- short evidence and next-step treatment inside the main card

Recommended example content:

- Top direction: `운영 중심 프로덕트 매니저`
- Why this fits: `프로세스 설계, 부서 간 조율, 운영 지표 관리 경험이 반복적으로 드러납니다.`
- Evidence strength label: `근거 강도 높음`
- Still unclear: `제품 전략 우선순위 결정 경험은 추가 확인이 필요합니다.`
- Next step: `최근 2개 프로젝트에서 의사결정 책임 범위를 한 줄씩 보강하세요.`

Alternate cards:

- `고객성공 운영`
- `서비스 운영 기획`

### 4. Trust Section

Keep trust proof on the page, but simplify it into three short cards with stronger hierarchy.

Recommended headings:

- `왜 이 방향을 추천했는지 보여줍니다`
- `확실하지 않은 부분은 따로 표시합니다`
- `다음 행동까지 바로 연결합니다`

This section should sit below the hero if the sample result preview is integrated into the hero zone, or directly beside it if the layout supports it.

### 5. Intake Card Adjustments

Do not redesign the intake flow architecture. Keep the current two-step structure.

Change only:

- rename the card header away from "Start a session"
- reduce helper copy density
- add the orientation band
- make the two source choices easier to compare at a glance

Recommended header copy:

- Eyebrow: `시작하기`
- Title: `Unlockr가 읽을 이력서를 보내주세요`
- Body: `지금 가지고 있는 형태를 그대로 선택하면 됩니다. 부족한 정보는 결과 단계에서 다시 보완할 수 있습니다.`

Source option copy:

- `텍스트 붙여넣기`
  - Benefit: `가장 빠르게 결과를 확인할 수 있습니다`
  - Support: `복사한 이력서나 자기소개 텍스트를 바로 분석합니다`
- `파일 업로드`
  - Benefit: `원본 이력서 기준으로 검토할 수 있습니다`
  - Support: `PDF, DOCX, TXT 파일에서 텍스트를 추출해 같은 흐름으로 분석합니다`

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
