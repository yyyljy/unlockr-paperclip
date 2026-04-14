import Link from "next/link";

import { IntakeForm } from "@/components/intake-form";

const marqueeItems = [
  "evidence-first direction finding",
  "ambiguity stays visible",
  "resume to next role",
  "recommendation with proof",
  "rewrite the next move",
];

const heroMetrics = [
  {
    index: "01",
    title: "Signal extraction",
    body: "담당 업무, 협업 방식, 사용 도구, 수치 성과를 직무 언어로 다시 묶습니다.",
  },
  {
    index: "02",
    title: "Grounded judgment",
    body: "판단이 강한 이유와 아직 약한 지점을 나눠 보여줘서 결과를 더 믿을 수 있습니다.",
  },
  {
    index: "03",
    title: "Next move ready",
    body: "추천에서 끝나지 않고 어떤 문장을 보강하면 좋은지 바로 다음 행동으로 이어집니다.",
  },
] as const;

const proofSteps = [
  {
    index: "01",
    title: "경험을 연차가 아니라 역할의 성격으로 읽습니다",
    body: "운영 설계, 고객 이슈 조율, 지표 관리, 제품 협업처럼 실제 업무의 결을 먼저 잡습니다.",
  },
  {
    index: "02",
    title: "성과 문장만 별도로 밀어 올립니다",
    body: "숫자, 개선 폭, 책임 범위가 드러나는 문장을 방향 적합도 판단의 핵심 증거로 삼습니다.",
  },
  {
    index: "03",
    title: "억지 추천 대신 불확실성을 남겨둡니다",
    body: "전략 책임이나 산업 전환처럼 정보가 약한 구간은 보완 질문 후보로 분리합니다.",
  },
] as const;

const sampleEvidence = [
  "업무 흐름을 정리하고 실행 구조를 만든 경험이 반복됩니다.",
  "여러 팀 사이에서 우선순위를 맞추며 진행한 흔적이 분명합니다.",
  "운영 지표나 성과 숫자를 다룬 문장이 방향 적합도를 높입니다.",
] as const;

const detailNotes = [
  {
    label: "Input",
    value: "이력서 텍스트, PDF, DOCX, TXT",
  },
  {
    label: "Output",
    value: "가장 유력한 방향, 근거, 불확실성, 바로 할 다음 행동",
  },
  {
    label: "Time",
    value: "첫 결과는 보통 1분 안팎",
  },
] as const;

const alternateDirections = [
  {
    title: "고객성공 운영",
    description: "고객 이슈 정리, 운영 흐름 설계, 협업 조율 경험이 강하게 연결되는 방향입니다.",
  },
  {
    title: "서비스 운영 기획",
    description: "현장 운영과 개선 과제를 구조화해 실행한 경험이 있다면 함께 검토할 수 있습니다.",
  },
  {
    title: "프로덕트 오퍼레이션",
    description: "프로세스와 지표를 정리해 제품 조직의 실행 속도를 높이는 역할과도 맞닿아 있습니다.",
  },
] as const;

const closingNotes = [
  "근거가 있는 방향만 보여줍니다.",
  "정보가 부족하면 추측 대신 추가 질문을 합니다.",
  "결과를 본 뒤 바로 이력서 문장을 고칠 수 있게 설계했습니다.",
] as const;

export default function Home() {
  const repeatedMarquee = [...marqueeItems, ...marqueeItems];

  return (
    <main className="landing-page flex flex-1 flex-col">
      <section className="landing-hero">
        <div className="landing-grid-overlay" aria-hidden="true" />
        <div className="landing-hero-glow" aria-hidden="true" />

        <div className="mx-auto flex min-h-[100svh] w-full max-w-[1520px] flex-col px-5 pb-8 pt-5 md:px-8 lg:px-10">
          <header className="landing-rise flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.34em] text-white/42">
                Resume Direction Engine
              </span>
            </div>
            <Link
              href="/sessions"
              className="inline-flex min-h-[2.75rem] items-center rounded-full border border-white/14 px-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/78 transition hover:border-white/28 hover:text-white"
            >
              Recent Results
            </Link>
          </header>

          <div className="grid flex-1 gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,500px)] lg:items-end lg:gap-14 lg:py-12">
            <div className="flex flex-col justify-end">
              <div className="landing-rise landing-delay-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/44">
                  Unlockr / grounded career positioning
                </p>
                <h1 className="mt-3 text-[clamp(4.8rem,12vw,11rem)] font-semibold leading-none tracking-[-0.08em] text-white">
                  Unlockr
                </h1>
              </div>

              <div className="landing-rise landing-delay-2 mt-8 max-w-[42rem]">
                <p className="max-w-[12ch] text-[clamp(1.8rem,3.9vw,4rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-white">
                  다음 커리어는 이미 이력서 안에 있습니다.
                </p>
                <p className="mt-5 max-w-xl text-sm leading-7 text-white/68 md:text-base md:leading-8">
                  Unlockr는 경력의 표면이 아니라 방향이 되는 문장만 다시 읽습니다.
                  운영 감각, 협업 구조, 도구 맥락, 성과 수치를 엮어 지금 가장
                  설득력 있는 다음 직무를 제안합니다.
                </p>
                <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">
                  프로덕트 / 운영 / 고객성공 / 데이터 / 디자인
                </p>
              </div>

              <div className="landing-rise landing-delay-3 mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
                <a
                  href="#resume-intake"
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-[color:var(--accent)] px-7 text-sm font-semibold text-white transition hover:opacity-92"
                >
                  내 이력서로 시작하기
                </a>
                <Link
                  href="/sessions"
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/14 px-7 text-sm font-semibold text-white/82 transition hover:border-white/28 hover:text-white"
                >
                  최근 결과 보기
                </Link>
                <p className="max-w-xs text-xs uppercase tracking-[0.24em] text-white/38">
                  first pass in about a minute
                </p>
              </div>

              <div className="landing-rise landing-delay-3 mt-12 grid gap-6 border-t border-white/10 pt-7 md:grid-cols-3">
                {heroMetrics.map((metric) => (
                  <article key={metric.index} className="space-y-3">
                    <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/34">
                      {metric.index}
                    </p>
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold text-white">{metric.title}</h2>
                      <p className="max-w-xs text-sm leading-7 text-white/62">
                        {metric.body}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="landing-rise landing-delay-2 relative">
              <div className="pointer-events-none absolute -left-12 top-14 hidden h-28 w-28 rounded-full border border-white/10 lg:block" />
              <div className="pointer-events-none absolute -right-10 bottom-8 hidden h-48 w-48 rounded-full border border-white/10 lg:block" />
              <div className="landing-form-shell">
                <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/44">
                      Live intake
                    </p>
                    <p className="mt-2 text-sm text-white/68">
                      이력서를 보내면 가장 유력한 방향부터 먼저 정리합니다.
                    </p>
                  </div>
                  <div className="rounded-full border border-white/14 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-white/50">
                    live
                  </div>
                </div>
                <IntakeForm />
              </div>
            </div>
          </div>
        </div>

        <div className="landing-marquee border-t border-white/10">
          <div className="landing-marquee-track py-4 font-mono text-[11px] uppercase tracking-[0.34em] text-white/38">
            {repeatedMarquee.map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-5 py-[4.5rem] md:px-8 lg:px-10 lg:py-24">
        <div className="grid gap-14 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-20">
          <div className="lg:sticky lg:top-10 lg:h-fit">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--muted-foreground)]">
              Why it feels sharper
            </p>
            <h2 className="mt-4 max-w-[10ch] text-4xl font-semibold leading-[1.02] tracking-[-0.05em] md:text-5xl">
              이 페이지는 방향을 보여주는 방식부터 다르게 구성했습니다.
            </h2>
          </div>

          <div className="border-t border-[color:var(--border)]">
            {proofSteps.map((step) => (
              <article
                key={step.index}
                className="grid gap-4 border-b border-[color:var(--border)] py-7 md:grid-cols-[110px_minmax(0,1fr)] md:gap-8"
              >
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-[color:var(--muted-foreground)]">
                  {step.index}
                </p>
                <div className="space-y-3">
                  <h3 className="max-w-2xl text-2xl font-semibold leading-[1.08] tracking-[-0.04em] md:text-3xl">
                    {step.title}
                  </h3>
                  <p className="max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)] md:text-base md:leading-8">
                    {step.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-black/8 bg-[#111714] text-[#f4eee2]">
        <div className="mx-auto grid w-full max-w-[1440px] gap-14 px-5 py-[4.5rem] md:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:px-10 lg:py-24">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/42">
              Example outcome
            </p>
            <h2 className="mt-4 max-w-[11ch] text-4xl font-semibold leading-[1.02] tracking-[-0.05em] md:text-5xl">
              결과 화면은 한 방향을 먼저 밀고, 근거는 바로 옆에 붙입니다.
            </h2>

            <div className="mt-12 space-y-8">
              <div className="border-t border-white/10 pt-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/42">
                  Primary direction
                </p>
                <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
                  운영 중심 프로덕트 매니저
                </h3>
                <p className="mt-4 max-w-lg text-sm leading-7 text-white/68 md:text-base md:leading-8">
                  프로세스 설계, 부서 간 조율, 운영 지표 관리 경험이 반복적으로
                  드러날 때 가장 먼저 보이는 방향입니다.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {detailNotes.map((note) => (
                  <div key={note.label} className="border-t border-white/10 pt-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-white/38">
                      {note.label}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-white/74">{note.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-10 lg:pt-16">
            <div className="border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/42">
                Why this route
              </p>
              <ul className="mt-5 space-y-4 text-sm leading-7 text-white/74">
                {sampleEvidence.map((item) => (
                  <li key={item} className="border-t border-white/10 pt-4">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="border-t border-white/10 pt-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/42">
                  Uncertainty
                </p>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  제품 전략 우선순위 결정 경험은 아직 추가 확인이 필요합니다.
                </p>
              </div>
              <div className="border-t border-white/10 pt-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/42">
                  Next move
                </p>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  최근 2개 프로젝트에서 의사결정 책임 범위를 한 줄씩 더 보강하세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-5 py-[4.5rem] md:px-8 lg:px-10 lg:py-24">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-20">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--muted-foreground)]">
              Final read
            </p>
            <h2 className="mt-4 max-w-[11ch] text-4xl font-semibold leading-[1.02] tracking-[-0.05em] md:text-5xl">
              하나의 직무만 고집하지 않고, 옆으로 이어지는 방향도 같이 남깁니다.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-[color:var(--muted-foreground)] md:text-base md:leading-8">
              가장 유력한 방향을 먼저 보여주되, 인접한 역할까지 함께 확인할 수
              있어 경력 전환의 폭을 더 현실적으로 잡을 수 있습니다.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#resume-intake"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[color:var(--foreground)] px-6 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-92"
              >
                지금 바로 분석 시작하기
              </a>
              <Link
                href="/sessions"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[color:var(--border)] px-6 text-sm font-semibold transition hover:bg-black/4"
              >
                최근 결과 다시 보기
              </Link>
            </div>
          </div>

          <div className="space-y-10">
            <div className="border-t border-[color:var(--border)]">
              {alternateDirections.map((direction) => (
                <article
                  key={direction.title}
                  className="grid gap-3 border-b border-[color:var(--border)] py-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8"
                >
                  <h3 className="text-lg font-semibold">{direction.title}</h3>
                  <p className="text-sm leading-7 text-[color:var(--muted-foreground)] md:text-base md:leading-8">
                    {direction.description}
                  </p>
                </article>
              ))}
            </div>

            <div className="grid gap-4">
              {closingNotes.map((note) => (
                <div key={note} className="border-t border-[color:var(--border)] pt-4">
                  <p className="text-sm leading-7 text-[color:var(--muted-foreground)] md:text-base">
                    {note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
