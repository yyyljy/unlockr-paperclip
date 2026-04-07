import Link from "next/link";

import {
  loadOperatorReviewSnapshot,
  operatorHealthOutcomeStatuses,
} from "@/lib/analysis-sessions";
import {
  feedbackSentimentLabel,
  formatSessionDate,
  formatSessionDuration,
  sessionSourceLabel,
  sessionStatusLabel,
} from "@/lib/session-display";
import { feedbackEligibleSessionStatuses } from "@/lib/session-snapshot";

export const dynamic = "force-dynamic";

type OperatorReviewSnapshot = Awaited<ReturnType<typeof loadOperatorReviewSnapshot>>;
type RecentSessionEntry = OperatorReviewSnapshot["recentSessions"][number];
type SessionStatus = RecentSessionEntry["session"]["status"];
type OutcomeStatus = (typeof operatorHealthOutcomeStatuses)[number];
type ProblemSessionEntry = OperatorReviewSnapshot["healthSnapshot"]["problemSessions"][number];

function statusBadgeClasses(status: SessionStatus) {
  switch (status) {
    case "ready":
      return "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]";
    case "parser_failure":
    case "failed":
      return "bg-[color:var(--danger-surface)] text-[color:var(--danger)]";
    default:
      return "border border-[color:var(--border)] bg-white/80 text-[color:var(--foreground)]";
  }
}

function outcomeCardClasses(status: OutcomeStatus) {
  switch (status) {
    case "ready":
      return "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]";
    case "parser_failure":
    case "failed":
      return "bg-[color:var(--danger-surface)] text-[color:var(--danger)]";
    case "insufficient_evidence":
      return "border border-[color:var(--border)] bg-white/85 text-[color:var(--foreground)]";
  }
}

function feedbackBadgeClasses(sentiment: "helpful" | "not_helpful" | null) {
  switch (sentiment) {
    case "helpful":
      return "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]";
    case "not_helpful":
      return "bg-[color:var(--danger-surface)] text-[color:var(--danger)]";
    default:
      return "border border-[color:var(--border)] bg-white/80 text-[color:var(--foreground)]";
  }
}

function feedbackSummary(entry: RecentSessionEntry) {
  if (entry.feedbackEvent) {
    return {
      label: feedbackSentimentLabel(entry.feedbackEvent.sentiment),
      detail: entry.feedbackEvent.note?.trim()
        ? entry.feedbackEvent.note.trim()
        : `업데이트 ${formatSessionDate(entry.feedbackEvent.updatedAt)}`,
    };
  }

  if (feedbackEligibleSessionStatuses.has(entry.session.status)) {
    return {
      label: "피드백 없음",
      detail: "결과가 나온 항목이지만 아직 도움이 되었는지 저장되지 않았습니다.",
    };
  }

  return {
    label: "아직 대상 아님",
    detail: "피드백은 결과 준비 완료, 정보 보완 필요, 파일 읽기 실패 상태에서만 남길 수 있습니다.",
  };
}

function sessionNote(entry: {
  session: RecentSessionEntry["session"];
  retriedFromSession: RecentSessionEntry["retriedFromSession"];
}) {
  if (entry.retriedFromSession) {
    if (entry.retriedFromSession.status === "parser_failure") {
      return `${entry.retriedFromSession.id}에서 이어진 복구 결과입니다. 읽지 못한 파일 대신 교체 파일이나 정리된 텍스트로 다시 시작했습니다.`;
    }

    return `${entry.retriedFromSession.id}에서 이어진 보완 결과입니다. 기존 내용에 추가 설명을 붙여 다시 분석했습니다.`;
  }

  if (entry.session.latestErrorCode) {
    return `${entry.session.latestErrorCode}: ${
      entry.session.latestErrorMessage ?? "추가 오류 메시지가 없습니다."
    }`;
  }

  switch (entry.session.status) {
    case "ready":
      return "상세 화면에서 추천 방향, 근거, 다음 행동을 바로 확인할 수 있습니다.";
    case "insufficient_evidence":
      return "상세 화면에서 어떤 정보가 부족했는지와 보완 질문을 확인해 주세요.";
    case "parser_failure":
      return "상세 화면에서 파일 읽기 실패 원인과 다시 시도 방법을 확인해 주세요.";
    case "failed":
      return "상세 화면에서 실패 원인과 남아 있는 기술 정보를 확인해 주세요.";
    default:
      return "아직 입력 확인, 읽기, 분석 단계를 진행 중입니다.";
  }
}

function recoveryBadgeLabel(entry: RecentSessionEntry) {
  if (!entry.retriedFromSession) {
    return null;
  }

  return entry.retriedFromSession.status === "parser_failure"
    ? "파일 복구"
    : "정보 보완 재실행";
}

function outcomeSummaryCopy(status: OutcomeStatus) {
  switch (status) {
    case "ready":
      return "추천 가능한 결과까지 도달했습니다.";
    case "insufficient_evidence":
      return "조금 더 구체적인 정보가 있어야 방향을 자신 있게 제안할 수 있습니다.";
    case "parser_failure":
      return "파일에서 텍스트를 안정적으로 읽지 못해 새 입력이 필요합니다.";
    case "failed":
      return "근거 부족이 아닌 시스템 처리 문제로 멈췄습니다.";
  }
}

function sessionEndedAt(session: RecentSessionEntry["session"]) {
  return session.completedAt ?? (session.status === "failed" ? session.updatedAt : null);
}

function problemCode(entry: ProblemSessionEntry) {
  if (entry.session.latestErrorCode) {
    return entry.session.latestErrorCode;
  }

  switch (entry.session.status) {
    case "insufficient_evidence":
      return "insufficient_evidence";
    case "parser_failure":
      return "parser_failure";
    case "failed":
      return "failed";
    default:
      return "review_required";
  }
}

function problemDetail(entry: ProblemSessionEntry) {
  const message = entry.session.latestErrorMessage?.trim();

  if (message) {
    return message;
  }

  if (entry.recoveryAttemptCount > 0) {
    return `${sessionNote(entry)} 현재 창에서 연결된 재실행 ${entry.recoveryAttemptCount}건을 함께 볼 수 있습니다.`;
  }

  return sessionNote(entry);
}

export default async function SessionsPage() {
  const { recentSessions, healthSnapshot } = await loadOperatorReviewSnapshot();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10 md:px-10">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            최근 결과
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            최근 커리어 방향 결과와 진행 상태를 한곳에서 확인하세요
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--muted-foreground)] md:text-base">
            생성된 결과를 다시 열어보고, 보완이 필요한 경우 바로 이어서 재실행하고,
            어떤 결과가 도움이 되었는지 기록할 수 있습니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/"
              className="rounded-full bg-[color:var(--accent)] px-5 py-3 font-semibold text-white transition hover:opacity-90"
            >
              새 이력서로 다시 시작
            </Link>
            <a
              href="/api/health"
              className="rounded-full border border-[color:var(--border)] px-5 py-3 transition hover:bg-white/70"
            >
              시스템 상태 보기
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-[2rem] border border-[color:var(--border)] bg-white/80 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              이 페이지에서 할 수 있는 일
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
              <li>최근 결과 분포를 먼저 보고 지금 전체 흐름이 안정적인지 빠르게 읽을 수 있습니다.</li>
              <li>확인 필요 목록에서 보완이나 복구가 필요한 결과만 바로 모아볼 수 있습니다.</li>
              <li>상세 화면으로 들어가 근거, 다음 행동, 저장된 피드백까지 이어서 확인할 수 있습니다.</li>
            </ul>
          </section>

          <section className="rounded-[2rem] border border-[color:var(--border)] bg-white/80 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              현재 범위
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
              <li>최근 업데이트된 최대 25개 결과만 요약과 목록에 반영됩니다.</li>
              <li>아직 검색, 필터, 일괄 작업은 들어가 있지 않습니다.</li>
              <li>피드백은 최신 상태 1개만 유지되며 다시 저장하면 이전 내용이 교체됩니다.</li>
            </ul>
          </section>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--border)] bg-white/85 p-6 shadow-[0_10px_30px_rgba(18,19,20,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              최근 결과 요약
            </p>
            <h2 className="mt-2 text-2xl font-semibold md:text-3xl">
              최근 결과 분포와 처리 속도
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--muted-foreground)]">
              가장 최근 창에서 결과 준비 완료, 보완 필요, 실패 비율을 빠르게 읽고
              어디에 먼저 시선을 둘지 정할 수 있습니다.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              확인 범위
            </p>
            <p className="mt-2 text-3xl font-semibold">{healthSnapshot.windowSize}</p>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              최근 업데이트된 결과 기준
            </p>
            <a
              href="#recent-sessions"
              className="mt-4 inline-flex rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-white/70"
            >
              최근 결과 목록 보기
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {operatorHealthOutcomeStatuses.map((status) => (
            <article
              key={status}
              className={`rounded-[1.5rem] p-5 ${outcomeCardClasses(status)}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                {sessionStatusLabel(status)}
              </p>
              <p className="mt-3 text-4xl font-semibold">
                {healthSnapshot.outcomeCounts[status]}
              </p>
              <p className="mt-3 text-sm leading-7">{outcomeSummaryCopy(status)}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              완료 시간
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-[color:var(--muted-foreground)]">중간 완료 시간</p>
                <p className="mt-2 text-2xl font-semibold">
                  {formatSessionDuration(healthSnapshot.medianCompletionMs)}
                </p>
              </div>
              <div>
                <p className="text-sm text-[color:var(--muted-foreground)]">평균 완료 시간</p>
                <p className="mt-2 text-2xl font-semibold">
                  {formatSessionDuration(healthSnapshot.averageCompletionMs)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
              최근 창에서 완료된 {healthSnapshot.completedCount}개 결과를 기준으로 계산했습니다.
            </p>

            {healthSnapshot.slowestSession ? (
              <div className="mt-4 rounded-[1.25rem] border border-[color:var(--border)] bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                  가장 오래 걸린 최근 결과
                </p>
                <Link
                  href={`/sessions/${healthSnapshot.slowestSession.id}`}
                  className="mt-2 inline-flex break-all font-mono text-sm font-semibold underline decoration-[color:var(--border)] underline-offset-4"
                >
                  {healthSnapshot.slowestSession.id}
                </Link>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                  {healthSnapshot.slowestSession.candidateLabel || "이름 없는 결과"} ·{" "}
                  {formatSessionDuration(healthSnapshot.slowestSession.durationMs)} ·{" "}
                  {sessionStatusLabel(healthSnapshot.slowestSession.status)}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
                아직 현재 창 안에 완료된 결과가 없습니다.
              </p>
            )}
          </section>

          <section className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              추가 확인 필요
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-white/80 p-4">
                <p className="text-sm text-[color:var(--muted-foreground)]">진행 중</p>
                <p className="mt-2 text-2xl font-semibold">{healthSnapshot.inFlightCount}</p>
              </div>
              <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-white/80 p-4">
                <p className="text-sm text-[color:var(--muted-foreground)]">확인 필요 결과</p>
                <p className="mt-2 text-2xl font-semibold">
                  {healthSnapshot.problemSessions.length}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
              {healthSnapshot.inFlightCount > 0
                ? `${healthSnapshot.inFlightCount}개 결과가 아직 대기, 읽기, 분석 단계에 있어 위 종료 상태 집계에서는 제외됩니다.`
                : "현재 창의 결과는 모두 종료 상태까지 도달했습니다."}
            </p>
            <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
              파일 읽기 실패나 정보 보완 요청이 늘어날 때는 아래 확인 필요 목록을 먼저 보는 편이 좋습니다.
            </p>
            <a
              href="#attention-queue"
              className="mt-4 inline-flex rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-white/70"
            >
              확인 필요 목록 보기
            </a>
          </section>
        </div>
      </section>

      <section id="attention-queue" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              확인 필요 목록
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              복구나 확인이 필요한 최근 결과
            </h2>
          </div>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            최대 {healthSnapshot.problemSessions.length}개 결과를 보여줍니다.
          </p>
        </div>

        {healthSnapshot.problemSessions.length === 0 ? (
          <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
            <h3 className="text-lg font-semibold">지금은 바로 확인할 결과가 없습니다</h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
              현재 창에는 파일 읽기 실패, 처리 실패, 정보 보완 필요 상태가 없습니다.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {healthSnapshot.problemSessions.map((entry) => (
              <article
                key={entry.session.id}
                className="rounded-[2rem] border border-[color:var(--border)] bg-white/85 p-5 shadow-[0_10px_30px_rgba(18,19,20,0.05)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                      {entry.session.candidateLabel || "추가 확인 필요 결과"}
                    </p>
                    <Link
                      href={`/sessions/${entry.session.id}`}
                      className="mt-2 inline-flex break-all font-mono text-base font-semibold underline decoration-[color:var(--border)] underline-offset-4"
                    >
                      {entry.session.id}
                    </Link>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      생성 {formatSessionDate(entry.session.createdAt)} · 완료{" "}
                      {formatSessionDate(sessionEndedAt(entry.session))}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm">
                    {entry.recoveryAttemptCount > 0 ? (
                      <span className="rounded-full border border-[color:var(--border)] bg-white/80 px-4 py-2 font-semibold">
                        재실행 {entry.recoveryAttemptCount}회
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-4 py-2 font-semibold ${statusBadgeClasses(entry.session.status)}`}
                    >
                      {sessionStatusLabel(entry.session.status)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                      입력 방식
                    </p>
                    <p className="mt-2 text-sm">{sessionSourceLabel(entry.session.sourceType)}</p>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      업데이트 {formatSessionDate(entry.session.updatedAt)}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                      최근 이슈 코드
                    </p>
                    <p className="mt-2 break-all font-mono text-sm font-semibold">
                      {problemCode(entry)}
                    </p>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      최근 창 재실행 {entry.recoveryAttemptCount}회
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                      처리 시간
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {formatSessionDuration(entry.completionDurationMs)}
                    </p>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      생성부터 종료 상태까지 걸린 시간입니다.
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
                  {problemDetail(entry)}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  {entry.retriedFromSession ? (
                    <Link
                      href={`/sessions/${entry.retriedFromSession.id}`}
                      className="inline-flex text-sm font-semibold underline decoration-[color:var(--border)] underline-offset-4"
                    >
                      이전 결과 {entry.retriedFromSession.id}
                    </Link>
                  ) : (
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      상세 화면에서 근거, 재실행, 피드백 상태를 확인할 수 있습니다.
                    </p>
                  )}

                  <Link
                    href={`/sessions/${entry.session.id}`}
                    className="inline-flex rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-white/70"
                  >
                    상세 보기
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="recent-sessions" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              최근 결과
            </p>
            <h2 className="mt-2 text-2xl font-semibold">가장 최근 결과부터 확인</h2>
          </div>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            최대 {recentSessions.length}개 결과 표시
          </p>
        </div>

        {recentSessions.length === 0 ? (
          <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
            <h3 className="text-lg font-semibold">아직 생성된 결과가 없습니다</h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
              홈에서 텍스트 붙여넣기나 파일 업로드로 시작하면 이곳에서 최근 결과를 다시 볼 수 있습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentSessions.map((entry) => {
              const feedback = feedbackSummary(entry);

              return (
                <article
                  key={entry.session.id}
                  className="rounded-[2rem] border border-[color:var(--border)] bg-white/85 p-5 shadow-[0_10px_30px_rgba(18,19,20,0.05)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                      {entry.session.candidateLabel || "이름 없는 결과"}
                    </p>
                      <h3 className="mt-2 break-all font-mono text-base font-semibold md:text-lg">
                        {entry.session.id}
                      </h3>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      생성 {formatSessionDate(entry.session.createdAt)} · 업데이트{" "}
                      {formatSessionDate(entry.session.updatedAt)}
                    </p>
                  </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                      {recoveryBadgeLabel(entry) ? (
                        <span className="rounded-full border border-[color:var(--border)] bg-white/80 px-4 py-2 font-semibold">
                          {recoveryBadgeLabel(entry)}
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-4 py-2 font-semibold ${statusBadgeClasses(entry.session.status)}`}
                      >
                        {sessionStatusLabel(entry.session.status)}
                      </span>
                      <span
                        className={`rounded-full px-4 py-2 font-semibold ${feedbackBadgeClasses(
                          entry.feedbackEvent?.sentiment ?? null,
                        )}`}
                      >
                        {feedback.label}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[180px_1fr_auto] lg:items-start">
                    <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                        입력 방식
                      </p>
                      <p className="mt-2 text-sm">{sessionSourceLabel(entry.session.sourceType)}</p>
                      <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                        완료 {formatSessionDate(sessionEndedAt(entry.session))}
                      </p>
                    </div>

                    <div
                      className={`grid gap-4 ${entry.retriedFromSession ? "md:grid-cols-3" : "md:grid-cols-2"}`}
                    >
                      <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                          결과 메모
                        </p>
                        <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                          {sessionNote(entry)}
                        </p>
                      </div>

                      <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                          피드백
                        </p>
                        <p className="mt-2 text-sm font-semibold">{feedback.label}</p>
                        <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                          {feedback.detail}
                        </p>
                      </div>

                      {entry.retriedFromSession ? (
                        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                            이전 결과에서 이어짐
                          </p>
                          <Link
                            href={`/sessions/${entry.retriedFromSession.id}`}
                            className="mt-2 inline-flex font-mono text-sm font-semibold underline decoration-[color:var(--border)] underline-offset-4"
                          >
                            {entry.retriedFromSession.id}
                          </Link>
                          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                            이전 상태 {sessionStatusLabel(entry.retriedFromSession.status)}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <Link
                      href={`/sessions/${entry.session.id}`}
                      className="inline-flex rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-white/70"
                    >
                      상세 보기
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
