import Link from "next/link";

import { IntakeForm } from "@/components/intake-form";

const roleFamilies = ["프로덕트", "운영", "고객성공", "데이터", "디자인"];

const trustCues = [
  "근거가 있는 방향만 보여줍니다",
  "정보가 부족하면 추측 대신 추가 질문을 합니다",
  "다음 행동까지 바로 이어집니다",
];

const alternateDirections = [
  {
    title: "고객성공 운영",
    description: "고객 이슈 정리, 운영 흐름 설계, 협업 조율 경험이 강하게 연결되는 방향입니다.",
  },
  {
    title: "서비스 운영 기획",
    description: "현장 운영과 개선 과제를 구조화해 실행한 경험이 있다면 함께 검토할 수 있습니다.",
  },
];

const trustCards = [
  {
    title: "왜 이 방향을 추천했는지 보여줍니다",
    description: "이력서 안의 업무, 도구, 성과 문장을 근거와 함께 묶어서 설명합니다.",
    tone: "sage",
  },
  {
    title: "확실하지 않은 부분은 따로 표시합니다",
    description: "판단이 약한 구간은 숨기지 않고 추가 확인이 필요한 항목으로 분리합니다.",
    tone: "sand",
  },
  {
    title: "다음 행동까지 바로 연결합니다",
    description: "추천만 끝내지 않고 어떤 문장과 경험을 보강하면 좋은지 바로 제안합니다.",
    tone: "rose",
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8 md:px-10 md:py-12">
      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
        <div className="space-y-6">
          <div className="inline-flex rounded-full border border-[color:var(--border)] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--muted-foreground)]">
            이력서 기반 커리어 방향 찾기
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
              내 경험으로 현실적인 다음 커리어 방향을 찾으세요
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[color:var(--muted-foreground)] md:text-lg">
              이력서나 자기소개를 올리면 Unlockr가 맞을 가능성이 높은 직무
              방향, 그 근거, 아직 부족한 정보, 바로 할 다음 행동까지 정리해
              드립니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {roleFamilies.map((family) => (
              <span
                key={family}
                className="rounded-full border border-[color:var(--border)] bg-[color:var(--panel-strong)] px-4 py-2 text-sm text-[color:var(--muted-foreground)]"
              >
                {family}
              </span>
            ))}
          </div>

          <div className="space-y-3">
            <a
              href="#resume-intake"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-white transition hover:opacity-90"
            >
              내 이력서로 시작하기
            </a>
            <p className="text-sm leading-7 text-[color:var(--muted-foreground)]">
              이미 생성된 결과를 확인해야 하나요?{" "}
              <Link
                href="/sessions"
                className="font-semibold text-[color:var(--accent-strong)] underline-offset-4 hover:underline"
              >
                최근 결과 보기
              </Link>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {trustCues.map((cue) => (
              <article
                key={cue}
                className="rounded-[1.5rem] border border-[color:var(--sage-border)] bg-[color:var(--sage-surface)] p-4 text-sm leading-7 text-[color:var(--foreground)]"
              >
                {cue}
              </article>
            ))}
          </div>
        </div>

        <IntakeForm />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
        <article className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-6 shadow-[0_20px_60px_rgba(18,19,20,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                예시 결과
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                결과 화면에서는 가장 유력한 방향과 이유를 먼저 보여줍니다
              </h2>
            </div>
            <span className="rounded-full border border-[color:var(--border)] bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
              첫 결과는 보통 1분 안팎
            </span>
          </div>

          <div className="mt-5 rounded-[1.75rem] border border-[color:var(--sage-border)] bg-[color:var(--sage-surface)] p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--sage-strong)]">
                  가장 가능성 높은 방향
                </p>
                <h3 className="mt-2 text-3xl font-semibold">
                  운영 중심 프로덕트 매니저
                </h3>
              </div>
              <span className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-[color:var(--sage-strong)]">
                근거 강도 높음
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)] md:text-base">
              프로세스 설계, 부서 간 조율, 운영 지표 관리 경험이 반복적으로
              드러납니다.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-[1.12fr_0.88fr]">
              <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-5">
                <p className="text-sm font-semibold">왜 이렇게 봤나요</p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                  <li>업무 흐름을 정리하고 실행 구조를 만든 경험이 반복됩니다.</li>
                  <li>여러 팀 사이에서 우선순위를 맞추며 진행한 흔적이 분명합니다.</li>
                  <li>운영 지표나 성과 숫자를 다룬 문장이 방향 적합도를 높여 줍니다.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-5">
                  <p className="text-sm font-semibold">아직 불확실한 점</p>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                    제품 전략 우선순위 결정 경험은 추가 확인이 필요합니다.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)]/60 p-5">
                  <p className="text-sm font-semibold text-[color:var(--accent-strong)]">
                    바로 할 다음 행동
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                    최근 2개 프로젝트에서 의사결정 책임 범위를 한 줄씩
                    보강하세요.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {alternateDirections.map((direction) => (
              <article
                key={direction.title}
                className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-5"
              >
                <p className="text-sm font-semibold">{direction.title}</p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                  {direction.description}
                </p>
              </article>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            왜 믿을 수 있나요
          </p>
          <div className="mt-4 space-y-3">
            {trustCards.map((card) => {
              const toneClass =
                card.tone === "sage"
                  ? "border-[color:var(--sage-border)] bg-[color:var(--sage-surface)]"
                  : card.tone === "rose"
                    ? "border-[color:var(--rose-border)] bg-[color:var(--rose-surface)]"
                    : "border-[color:var(--border)] bg-white/80";

              return (
                <div
                  key={card.title}
                  className={`rounded-[1.5rem] border p-5 ${toneClass}`}
                >
                  <h3 className="text-base font-semibold">{card.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-[color:var(--border)] bg-white/70 p-5">
            <p className="text-sm font-semibold">정보가 약하면 어떻게 되나요</p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
              근거가 약한 경우에는 억지 추천 대신 보완 질문을 먼저 드립니다.
              그래서 결과가 덜 화려해 보여도 판단 신뢰도는 더 높게 유지됩니다.
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}
