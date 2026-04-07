"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState, type FormEvent } from "react";

import type { AnalysisResult } from "@/lib/contracts/recommendations";
import {
  feedbackSentimentLabel,
  formatSessionDate,
  sessionSourceLabel,
  sessionStatusLabel,
} from "@/lib/session-display";
import type { SessionSnapshot } from "@/lib/session-snapshot";
import {
  feedbackEligibleSessionStatuses,
  terminalSessionStatuses,
} from "@/lib/session-snapshot";

type FeedbackSentiment = NonNullable<SessionSnapshot["feedbackEvent"]>["sentiment"];
type RecoveryResponse = { sessionId?: string; message?: string } | null;
type ParserFailureRecoveryMode = "file_upload" | "pasted_text";
type ReadyEvidenceQuality = Extract<AnalysisResult, { status: "ready" }>["summary"]["evidenceQuality"];
type ReadyRecommendation = Extract<
  AnalysisResult,
  { status: "ready" }
>["recommendations"][number];
type RecommendationConfidenceLabel = Extract<
  AnalysisResult,
  { status: "ready" }
>["recommendations"][number]["confidence"]["label"];
type RecommendationGapUrgency = Extract<AnalysisResult, { status: "ready" }>["recommendations"][number]["gaps"][number]["urgency"];
type RecommendationPath = AnalysisResult["metadata"]["recommendationPath"];
type RecommendationPathContext = AnalysisResult["metadata"]["pathContext"];
type SessionStatus = SessionSnapshot["session"]["status"];

const recoveryClarificationMaxLength = 4000;
const recoveryResumeTextMaxLength = 12000;
const minimumRecoveryClarificationLength = 12;
const minimumRecoveryResumeTextLength = 40;

async function fetchSessionSnapshot(sessionId: string) {
  const response = await fetch(`/api/sessions/${sessionId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as SessionSnapshot;
}

function confidenceLabel(confidence: RecommendationConfidenceLabel) {
  switch (confidence) {
    case "high":
      return "적합도 높음";
    case "medium":
      return "적합도 보통";
    case "low":
      return "적합도 낮음";
    case "insufficient":
      return "판단 보류";
  }
}

function evidenceQualityLabel(evidenceQuality: ReadyEvidenceQuality) {
  switch (evidenceQuality) {
    case "strong":
      return "근거 강함";
    case "mixed":
      return "근거 보통";
    case "thin":
      return "근거 부족";
  }
}

function evidenceQualitySummary(evidenceQuality: ReadyEvidenceQuality) {
  switch (evidenceQuality) {
    case "strong":
      return "여러 근거가 같은 방향을 가리켜 바로 검토하고 행동으로 옮기기 좋은 상태입니다.";
    case "mixed":
      return "방향은 보이지만 역할 깊이나 도구 맥락이 덜 드러나 있어, 표시된 빈틈을 먼저 확인하는 편이 좋습니다.";
    case "thin":
      return "가능성 있는 방향은 보이지만 근거 폭이 좁습니다. 출발점으로 보고 부족한 정보를 먼저 보완해 주세요.";
  }
}

function evidenceQualityBadgeClassName(evidenceQuality: ReadyEvidenceQuality) {
  switch (evidenceQuality) {
    case "strong":
      return "border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]";
    case "mixed":
      return "border-[color:var(--border)] bg-white/80 text-[color:var(--foreground)]";
    case "thin":
      return "border-[color:var(--danger-border)] bg-[color:var(--danger-surface)] text-[color:var(--danger)]";
  }
}

function recommendationPathLabel(path: RecommendationPath) {
  switch (path) {
    case "model_backed":
      return "모델 기반 판단";
    case "fallback":
      return "보조 규칙 판단";
    case null:
      return "판단 경로 없음";
  }
}

function recommendationPathBadgeClassName(path: RecommendationPath) {
  switch (path) {
    case "model_backed":
      return "border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]";
    case "fallback":
      return "border border-[color:var(--border)] bg-white/80 text-[color:var(--foreground)]";
    case null:
      return "border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--muted-foreground)]";
  }
}

function pathProviderLabel(provider: string | null | undefined) {
  switch (provider) {
    case "codex-local":
      return "Codex local";
    case "openai":
      return "OpenAI";
    default:
      return provider ?? "모델";
  }
}

function recommendationPathSummary(input: {
  recommendationPath: RecommendationPath;
  pathContext: RecommendationPathContext;
}) {
  if (input.recommendationPath === "model_backed") {
    return {
      title: "모델 분석을 통과한 결과입니다",
      detail:
        "이번 결과는 모델 판단과 저장된 근거 문장을 함께 통과한 경로입니다. 그래도 아래 근거와 빈틈을 먼저 확인하고 움직이는 편이 좋습니다.",
      tone: "accent" as const,
    };
  }

  if (input.pathContext?.status === "fallback_timeout") {
    return {
      title: "모델 응답이 길어져 보조 규칙으로 전환되었습니다",
      detail: `${pathProviderLabel(
        input.pathContext.attemptedProvider,
      )} 응답이 제한 시간 안에 끝나지 않아 이번 결과는 보조 규칙으로 정리되었습니다. 개인화된 모델 해석으로 받아들이기보다 아래 근거 문장을 먼저 확인해 주세요.`,
      tone: "warning" as const,
    };
  }

  if (input.pathContext?.status === "fallback_error") {
    return {
      title: "모델 경로 오류로 보조 규칙 판단을 보여드립니다",
      detail: `${pathProviderLabel(
        input.pathContext.attemptedProvider,
      )} 경로에서 오류가 발생해 이번 결과는 보조 규칙으로 생성되었습니다. 역할 방향은 참고용으로 보고 근거와 주의할 점을 함께 확인해 주세요.`,
      tone: "neutral" as const,
    };
  }

  return {
    title: "이번 결과는 보조 규칙으로 정리되었습니다",
    detail:
      "현재 이력서에 직접 드러난 역할, 도구, 성과 신호를 바탕으로 규칙 점수를 계산한 결과입니다. 아래 근거 문장을 먼저 확인하고 해석해 주세요.",
    tone: "neutral" as const,
  };
}

function recommendationPathSummaryClassName(tone: "accent" | "neutral" | "warning") {
  switch (tone) {
    case "accent":
      return "border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)]/60";
    case "warning":
      return "border-[color:var(--danger-border)] bg-[color:var(--danger-surface)]";
    case "neutral":
      return "border-[color:var(--border)] bg-white/80";
  }
}

function sessionStatusBadgeClassName(status: SessionStatus) {
  switch (status) {
    case "ready":
      return "bg-[color:var(--accent)] text-white";
    case "parser_failure":
    case "failed":
      return "bg-[color:var(--danger)] text-white";
    case "insufficient_evidence":
      return "border border-[color:var(--border)] bg-white/85 text-[color:var(--foreground)]";
    default:
      return "border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--foreground)]";
  }
}

function sessionOverviewTitle(snapshot: SessionSnapshot) {
  if (snapshot.result?.status === "ready") {
    return snapshot.result.summary.candidateHeadline;
  }

  if (snapshot.session.status === "insufficient_evidence") {
    return snapshot.session.candidateLabel
      ? `${snapshot.session.candidateLabel}에 대해 조금 더 정보가 필요합니다`
      : "추천 전에 조금 더 정보가 필요합니다";
  }

  if (snapshot.session.status === "parser_failure") {
    return "업로드한 파일을 읽어들이지 못했습니다";
  }

  if (snapshot.session.status === "failed") {
    return "결과를 만들기 전에 처리가 중단되었습니다";
  }

  return snapshot.session.candidateLabel
    ? `${snapshot.session.candidateLabel} 결과를 준비하고 있습니다`
    : "Unlockr가 결과를 준비하고 있습니다";
}

function sessionOverviewSummary(snapshot: SessionSnapshot) {
  if (snapshot.result?.status === "ready") {
    return snapshot.result.summary.fitSummary;
  }

  if (snapshot.result?.status === "insufficient_evidence") {
    return snapshot.result.userMessage;
  }

  if (snapshot.result?.status === "parser_failure") {
    return snapshot.result.userMessage;
  }

  if (snapshot.session.status === "failed") {
    return (
      snapshot.session.latestErrorMessage ??
      "근거 있는 결과를 보여주기 전에 시스템 처리 문제로 멈췄습니다."
    );
  }

  if (!snapshot.latestRun) {
    return "요청은 접수되었고 첫 작업을 시작하기 전입니다.";
  }

  if (snapshot.latestRun.stage === "parse") {
    return "이력서에서 텍스트를 읽어 핵심 정보를 정리하고 있습니다.";
  }

  return "읽어낸 내용을 바탕으로 프로필, 추천 방향, 다음 행동을 정리하고 있습니다.";
}

function sessionStatusDetail(snapshot: SessionSnapshot) {
  switch (snapshot.session.status) {
    case "ready":
      return snapshot.result?.status === "ready"
        ? `추천 방향 ${snapshot.result.recommendations.length}개를 정리했고 ${evidenceQualityLabel(snapshot.result.summary.evidenceQuality)} 상태입니다.`
        : "결과는 준비되었고 이제 내용을 확인하면 됩니다.";
    case "insufficient_evidence":
      return "가능성은 보였지만 지금 정보만으로는 자신 있게 추천하지 않았습니다.";
    case "parser_failure":
      return "첫 단계에서 파일 읽기가 멈춰 억지 판단 대신 복구 경로를 먼저 보여줍니다.";
    case "failed":
      return "정보 부족이 아니라 시스템 처리 오류로 멈춘 상태입니다.";
    case "queued":
      return "작업 대기열에서 순서를 기다리고 있습니다.";
    case "parsing":
      return "이력서 텍스트를 읽고 정리하는 중입니다.";
    case "analyzing":
      return "프로필과 추천 방향을 만드는 중입니다.";
  }
}

function sessionNextAction(snapshot: SessionSnapshot) {
  if (snapshot.result?.status === "ready") {
    const topRecommendation = snapshot.result.recommendations[0];
    const nextStep = topRecommendation?.nextSteps[0];

    if (nextStep) {
      return {
        title: nextStep.title,
        detail: `${nextStep.detail} ${nextStep.timeline} · ${nextStep.effort} 강도.`,
        tone: "accent" as const,
      };
    }

    return {
      title: "가장 높은 순위 방향부터 검토하세요",
      detail:
        "가장 가능성이 높은 방향의 근거를 먼저 확인한 뒤, 부족한 점과 다음 행동을 차례로 보는 흐름이 좋습니다.",
      tone: "accent" as const,
    };
  }

  if (snapshot.result?.status === "insufficient_evidence") {
    return {
      title: "부족한 정보를 먼저 보완하세요",
      detail:
        "아래 보완 입력에 업무 범위, 사용 도구, 산업 맥락, 성과처럼 빠진 정보를 추가한 뒤 다시 실행해 주세요.",
      tone: "neutral" as const,
    };
  }

  if (snapshot.result?.status === "parser_failure") {
    switch (snapshot.result.requiredAction) {
      case "paste_text":
        return {
          title: "정리된 텍스트로 다시 시도하세요",
          detail:
            "파일 읽기 대신 아래 복구 입력에 정리된 이력서 텍스트를 붙여 넣으면 기존 실패 기록은 유지한 채 새 결과를 만들 수 있습니다.",
          tone: "danger" as const,
        };
      case "reupload":
        return {
          title: "더 깨끗한 파일로 다시 업로드하세요",
          detail:
            "교체용 PDF, DOCX, TXT 파일을 다시 올려 읽기 품질을 높인 뒤 새 결과를 만들어 보세요.",
          tone: "neutral" as const,
        };
      case "contact_support":
        return {
          title: "기술 정보 확인 후 수동으로 대응하세요",
          detail:
            "이 실패는 화면에서 바로 재시도할 수 없도록 표시되어 있으니, 아래 기술 정보를 먼저 확인해 주세요.",
          tone: "danger" as const,
        };
    }
  }

  if (snapshot.session.status === "failed") {
    return {
      title: "기술 정보와 상태를 먼저 확인하세요",
      detail:
        "다시 시도하거나 전달하기 전에 아래 기술 정보를 확인해 두면 원래 실패 맥락을 놓치지 않을 수 있습니다.",
      tone: "danger" as const,
    };
  }

  return {
    title: "결과가 정리될 때까지 잠시만 기다려 주세요",
    detail:
      "대기, 읽기, 분석 상태에서는 이 페이지가 자동으로 새로고침됩니다.",
    tone: "neutral" as const,
  };
}

function nextActionCardClassName(tone: "accent" | "danger" | "neutral") {
  switch (tone) {
    case "accent":
      return "border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)]";
    case "danger":
      return "border-[color:var(--danger-border)] bg-[color:var(--danger-surface)]";
    case "neutral":
      return "border-[color:var(--border)] bg-white/80";
  }
}

function gapUrgencyLabel(urgency: RecommendationGapUrgency) {
  switch (urgency) {
    case "now":
      return "지금 보완";
    case "soon":
      return "곧 보완";
    case "later":
      return "나중에 보완";
  }
}

function CandidateProfileSection({
  title,
  emptyText,
  signals,
}: {
  title: string;
  emptyText: string;
  signals: NonNullable<SessionSnapshot["candidateProfile"]>["roleSignals"];
}) {
  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-white/85 p-6 shadow-[0_10px_30px_rgba(18,19,20,0.05)]">
      <h3 className="text-lg font-semibold">{title}</h3>

      {signals.length === 0 ? (
        <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">{emptyText}</p>
      ) : (
        <div className="mt-4 space-y-4">
          {signals.map((signal) => (
            <article
              key={signal.key}
              className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                    {signal.label}
                  </p>
                  <p className="mt-2 text-sm leading-6">{signal.value}</p>
                </div>
                <div className="rounded-full bg-[color:var(--accent-soft)] px-4 py-2 text-xs font-semibold text-[color:var(--accent-strong)]">
                  {confidenceLabel(signal.confidence)}
                </div>
              </div>

              {signal.evidence.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {signal.evidence.map((evidence, index) => (
                    <div
                      key={`${signal.key}-${evidence.sectionLabel}-${index}`}
                      className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-4 text-sm"
                    >
                      <p className="leading-6">“{evidence.snippet}”</p>
                      <p className="mt-2 text-[color:var(--muted-foreground)]">
                        {evidence.reason}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function CandidateProfileView({
  candidateProfile,
}: {
  candidateProfile: SessionSnapshot["candidateProfile"];
}) {
  if (!candidateProfile) {
    return (
      <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
        <h2 className="text-lg font-semibold">정리된 프로필</h2>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          아직 구조화된 프로필이 저장되지 않았습니다.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              정리된 프로필
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              {candidateProfile.headline?.value ?? "요약 문장 없이 프로필만 먼저 정리되었습니다"}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              버전 {candidateProfile.profileVersion} · 생성{" "}
              {formatSessionDate(candidateProfile.createdAt)}
            </p>
          </div>
          <div className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm">
            {candidateProfile.sourceKind === "resume_text" ? "텍스트 붙여넣기" : "파일 업로드"}
          </div>
        </div>

        {candidateProfile.coverageNotes.length > 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
            <p className="text-sm font-semibold">읽은 범위 메모</p>
            <ul className="mt-3 space-y-2 text-sm text-[color:var(--muted-foreground)]">
              {candidateProfile.coverageNotes.map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <CandidateProfileSection
          title="역할 이력"
          emptyText="추출된 역할 이력 문장이 없습니다."
          signals={candidateProfile.roleHistory}
        />
        <CandidateProfileSection
          title="직무 신호"
          emptyText="추출된 직무 신호가 없습니다."
          signals={candidateProfile.roleSignals}
        />
        <CandidateProfileSection
          title="기술과 도구"
          emptyText="추출된 기술이나 도구 정보가 없습니다."
          signals={candidateProfile.skills}
        />
        <CandidateProfileSection
          title="도메인 신호"
          emptyText="추출된 도메인 신호가 없습니다."
          signals={candidateProfile.domainSignals}
        />
        <CandidateProfileSection
          title="성과 문장"
          emptyText="추출된 성과 문장이 없습니다."
          signals={candidateProfile.achievements}
        />
        <CandidateProfileSection
          title="학력과 자격"
          emptyText="추출된 학력이나 자격 정보가 없습니다."
          signals={[
            ...candidateProfile.educationSignals,
            ...candidateProfile.certificationSignals,
          ]}
        />
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: ReadyRecommendation }) {
  return (
    <article className="rounded-[2rem] border border-[color:var(--border)] bg-white/85 p-6 shadow-[0_10px_30px_rgba(18,19,20,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            추천 {recommendation.rank}
          </p>
          <h3 className="mt-2 text-xl font-semibold">{recommendation.roleTitle}</h3>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            {recommendation.targetDomains.join(" / ")}
          </p>
        </div>
        <div className="rounded-full bg-[color:var(--accent-soft)] px-4 py-2 text-sm font-medium text-[color:var(--accent-strong)]">
          {confidenceLabel(recommendation.confidence.label)} ·{" "}
          {Math.round(recommendation.confidence.score * 100)}%
        </div>
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
          왜 이렇게 판단했나요
        </p>
        <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
          {recommendation.confidence.explanation}
        </p>
      </div>

      <p className="mt-4 text-sm leading-7">{recommendation.rationale}</p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold">직접 드러난 경험</p>
          <ul className="mt-2 space-y-2 text-sm text-[color:var(--muted-foreground)]">
            {recommendation.detectedExperience.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">추가로 연결되는 가능성</p>
          <ul className="mt-2 space-y-2 text-sm text-[color:var(--muted-foreground)]">
            {recommendation.inferredPotential.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold">근거 문장</p>
          <div className="mt-2 space-y-3">
            {recommendation.evidence.map((evidence) => (
              <div
                key={evidence.evidenceId}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 text-sm"
              >
                <p className="leading-6">“{evidence.snippet}”</p>
                <p className="mt-2 text-[color:var(--muted-foreground)]">
                  {evidence.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">바로 할 다음 행동</p>
          <div className="mt-2 space-y-3">
            {recommendation.nextSteps.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 text-sm"
              >
                <p className="font-medium">{step.title}</p>
                <p className="mt-1 text-[color:var(--muted-foreground)]">{step.detail}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                  {step.timeline} · {step.effort} 강도
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
          <p className="text-sm font-semibold">먼저 메우면 좋은 빈틈</p>
          {recommendation.gaps.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              이 방향에서 바로 막히는 빈틈은 표시되지 않았습니다.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {recommendation.gaps.map((gap) => (
                <div
                  key={`${recommendation.recommendationId}-${gap.title}`}
                  className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">{gap.title}</p>
                    <span className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs uppercase tracking-[0.15em] text-[color:var(--muted-foreground)]">
                      {gapUrgencyLabel(gap.urgency)}
                    </span>
                  </div>
                  <p className="mt-2 leading-6 text-[color:var(--muted-foreground)]">
                    {gap.detail}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
          <p className="text-sm font-semibold">주의할 점</p>
          {recommendation.risks.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              추가로 크게 주의할 점은 표시되지 않았습니다.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {recommendation.risks.map((risk) => (
                <div
                  key={`${recommendation.recommendationId}-${risk}`}
                  className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-4 text-sm"
                >
                  <p className="leading-6 text-[color:var(--muted-foreground)]">{risk}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function SessionResult({ result }: { result: AnalysisResult | null }) {
  if (!result) {
    return (
      <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
        <h2 className="text-lg font-semibold">아직 결과를 정리하는 중입니다</h2>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          종료 상태용 결과 데이터가 아직 저장되지 않았습니다.
        </p>
      </div>
    );
  }

  if (result.status === "ready") {
    const [featuredRecommendation, ...otherRecommendations] = result.recommendations;
    const pathSummary = recommendationPathSummary({
      recommendationPath: result.metadata.recommendationPath,
      pathContext: result.metadata.pathContext,
    });

    return (
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                가장 먼저 볼 방향
              </p>
              <h2 className="mt-3 text-2xl font-semibold">
                {featuredRecommendation?.roleTitle ?? "가장 높은 우선순위 추천"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
                근거 문장과 주의할 점을 먼저 확인한 뒤, 아래 다른 방향과 비교해 보세요.
              </p>
            </div>
            <div
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${recommendationPathBadgeClassName(
                result.metadata.recommendationPath,
              )}`}
            >
              {recommendationPathLabel(result.metadata.recommendationPath)}
            </div>
          </div>

          <div
            className={`mt-5 rounded-[1.5rem] border p-4 ${recommendationPathSummaryClassName(
              pathSummary.tone,
            )}`}
          >
            <p className="text-sm font-semibold">{pathSummary.title}</p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
              {pathSummary.detail}
            </p>
          </div>

          {featuredRecommendation ? <div className="mt-5"><RecommendationCard recommendation={featuredRecommendation} /></div> : null}
        </section>

        <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                결과 읽는 법
              </p>
              <h2 className="mt-3 text-2xl font-semibold">왜 이 방향을 추천했는지 먼저 확인하세요</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
                {evidenceQualitySummary(result.summary.evidenceQuality)}
              </p>
            </div>
            <div
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${evidenceQualityBadgeClassName(
                result.summary.evidenceQuality,
              )}`}
            >
              {evidenceQualityLabel(result.summary.evidenceQuality)}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                추천 방향 수
              </p>
              <p className="mt-2 text-3xl font-semibold">{result.recommendations.length}</p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                가장 높은 순위 방향부터 보고, 뒤의 방향은 대안이나 인접 경로로 비교해 보세요.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                확인 순서
              </p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                근거 문장이 실제 이력서와 맞는지 확인한 뒤, 부족한 점과 다음 행동을 보고 움직이면 됩니다.
              </p>
            </div>
          </div>
        </section>

        {otherRecommendations.length > 0 ? (
          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                함께 볼 다른 방향
              </p>
              <h2 className="mt-3 text-2xl font-semibold">비교해 볼 수 있는 후순위 추천</h2>
            </div>
            <div className="grid gap-4">
              {otherRecommendations.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.recommendationId}
                  recommendation={recommendation}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  if (result.status === "insufficient_evidence") {
    return (
      <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
        <h2 className="text-2xl font-semibold">조금 더 정보가 필요합니다</h2>
        <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
          {result.userMessage}
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold">지금 막히는 이유</p>
            <ul className="mt-2 space-y-2 text-sm text-[color:var(--muted-foreground)]">
              {result.blockingFindings.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">보완 질문</p>
            <ul className="mt-2 space-y-2 text-sm text-[color:var(--muted-foreground)]">
              {result.followUpQuestions.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
      <h2 className="text-2xl font-semibold">파일 읽기 단계에서 멈췄습니다</h2>
      <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
        {result.userMessage}
      </p>
      <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
        아래 복구 기능에서 파일을 교체하거나 정리된 텍스트를 넣어 다시 시도할 수 있고, 기존 실패 기록은 그대로 남습니다.
      </p>
      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-[color:var(--accent-soft)] px-4 py-2 text-[color:var(--accent-strong)]">
          오류 코드: {result.errorCode}
        </span>
        <span className="rounded-full border border-[color:var(--border)] px-4 py-2">
          권장 동작: {result.requiredAction}
        </span>
        <span className="rounded-full border border-[color:var(--border)] px-4 py-2">
          재시도 가능: {result.retryable ? "예" : "아니오"}
        </span>
      </div>
    </section>
  );
}

function SessionOverview({ snapshot }: { snapshot: SessionSnapshot }) {
  const nextAction = sessionNextAction(snapshot);
  const currentStatusDetail = sessionStatusDetail(snapshot);

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            결과 개요
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            {sessionOverviewTitle(snapshot)}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--muted-foreground)] md:text-base">
            {sessionOverviewSummary(snapshot)}
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span
              className={`rounded-full px-4 py-2 font-semibold ${sessionStatusBadgeClassName(
                snapshot.session.status,
              )}`}
            >
              {sessionStatusLabel(snapshot.session.status)}
            </span>
            <span className="rounded-full border border-[color:var(--border)] bg-white/80 px-4 py-2">
              {sessionSourceLabel(snapshot.session.sourceType)}
            </span>
            {snapshot.result ? (
              <span
                className={`rounded-full border px-4 py-2 ${recommendationPathBadgeClassName(
                  snapshot.result.metadata.recommendationPath,
                )}`}
              >
                {recommendationPathLabel(snapshot.result.metadata.recommendationPath)}
              </span>
            ) : null}
            {snapshot.result?.status === "ready" ? (
              <span
                className={`rounded-full border px-4 py-2 ${evidenceQualityBadgeClassName(
                  snapshot.result.summary.evidenceQuality,
                )}`}
              >
                {evidenceQualityLabel(snapshot.result.summary.evidenceQuality)}
              </span>
            ) : null}
          </div>
        </div>

        <div
          className={`rounded-[1.75rem] border p-5 ${nextActionCardClassName(nextAction.tone)}`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            지금 할 일
          </p>
          <h2 className="mt-3 text-xl font-semibold">{nextAction.title}</h2>
          <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
            {nextAction.detail}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            현재 상태
          </p>
          <p className="mt-3 text-sm leading-7">{currentStatusDetail}</p>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            받은 입력
          </p>
          <p className="mt-3 text-sm font-semibold">
            {snapshot.session.candidateLabel ?? "이름이나 메모 없이 생성된 결과"}
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            입력 방식: {sessionSourceLabel(snapshot.session.sourceType)}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            진행 시각
          </p>
          <p className="mt-3 text-sm font-semibold">
            시작 {formatSessionDate(snapshot.session.createdAt)}
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            업데이트 {formatSessionDate(snapshot.session.updatedAt)}
          </p>
        </div>
      </div>
    </section>
  );
}

function SessionDebugDetails({ snapshot }: { snapshot: SessionSnapshot }) {
  const debugItems = [
    { label: "결과 ID", value: snapshot.session.id },
    {
      label: "현재 실행 상태",
      value: snapshot.latestRun
        ? `${snapshot.latestRun.stage} · ${snapshot.latestRun.status}`
        : "아직 실행이 만들어지지 않았습니다",
    },
    {
      label: "큐 작업 ID",
      value: snapshot.latestRun?.queueJobId ?? "대기 중",
    },
    {
      label: "계약 버전",
      value: snapshot.session.contractVersion ?? "대기 중",
    },
    {
      label: "파서 버전",
      value: snapshot.session.parserVersion ?? "대기 중",
    },
    {
      label: "판단 경로",
      value: recommendationPathLabel(snapshot.result?.metadata.recommendationPath ?? null),
    },
    {
      label: "모델 제공자",
      value: snapshot.result?.metadata.model?.provider ?? "대기 중",
    },
    {
      label: "모델 버전",
      value: snapshot.session.modelVersion ?? "대기 중",
    },
    {
      label: "프롬프트 버전",
      value: snapshot.session.promptVersion ?? "대기 중",
    },
    {
      label: "분류 체계 버전",
      value: snapshot.session.taxonomyVersion ?? "대기 중",
    },
    {
      label: "추천 묶음 ID",
      value: snapshot.recommendationSet?.id ?? "아직 없음",
    },
  ];

  if (snapshot.latestRun?.errorCode) {
    debugItems.push({
      label: "최근 실행 오류",
      value: `${snapshot.latestRun.errorCode}${
        snapshot.latestRun.errorMessage ? ` · ${snapshot.latestRun.errorMessage}` : ""
      }`,
    });
  } else if (snapshot.session.latestErrorCode) {
    debugItems.push({
      label: "최근 결과 오류",
      value: `${snapshot.session.latestErrorCode}${
        snapshot.session.latestErrorMessage ? ` · ${snapshot.session.latestErrorMessage}` : ""
      }`,
    });
  }

  return (
    <details className="rounded-[2rem] border border-[color:var(--border)] bg-white/80 p-6">
      <summary className="cursor-pointer list-none text-lg font-semibold">
        기술 정보
      </summary>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--muted-foreground)]">
        원본 식별자와 실행 상태 같은 기술 정보는 여기 모아 두고, 위 화면은 결과와 다음 행동에 집중하도록 분리했습니다.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {debugItems.map((item) => (
          <div
            key={item.label}
            className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              {item.label}
            </p>
            <p className="mt-2 break-all text-sm leading-6">{item.value}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

function SessionLineage({ snapshot }: { snapshot: SessionSnapshot }) {
  if (!snapshot.retriedFromSession && snapshot.recoverySessions.length === 0) {
    return null;
  }

  const retriedFromHeading =
    snapshot.retriedFromSession?.status === "parser_failure"
      ? "이전 파일 읽기 실패 결과에서 이어졌습니다"
      : "이전 정보 보완 필요 결과에서 이어졌습니다";
  const retriedFromDescription =
    snapshot.retriedFromSession?.status === "parser_failure"
      ? "이 결과는 이전 업로드를 읽지 못해 교체 입력으로 다시 시작한 흐름입니다."
      : "이 결과는 기존 입력에 추가 설명을 붙여 다시 실행한 흐름입니다.";

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
          이어진 결과
        </p>
        <h2 className="mt-3 text-2xl font-semibold">이 결과가 어디서 이어졌는지 보여줍니다</h2>
      </div>

      {snapshot.retriedFromSession ? (
        <div className="mt-5 rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
          <p className="text-sm font-semibold">{retriedFromHeading}</p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{retriedFromDescription}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <Link
              href={`/sessions/${snapshot.retriedFromSession.id}`}
              className="rounded-full border border-[color:var(--border)] px-4 py-2 font-semibold transition hover:bg-white/70"
            >
              이전 결과 열기 {snapshot.retriedFromSession.id}
            </Link>
            <span className="rounded-full bg-[color:var(--accent-soft)] px-4 py-2 text-[color:var(--accent-strong)]">
              {sessionStatusLabel(snapshot.retriedFromSession.status)}
            </span>
            <span className="rounded-full border border-[color:var(--border)] px-4 py-2">
              {sessionSourceLabel(snapshot.retriedFromSession.sourceType)}
            </span>
          </div>
        </div>
      ) : null}

      {snapshot.recoverySessions.length > 0 ? (
        <div className="mt-5 rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
          <p className="text-sm font-semibold">이 결과에서 다시 시작된 후속 실행</p>
          <div className="mt-4 space-y-3">
            {snapshot.recoverySessions.map((recoverySession) => (
              <div
                key={recoverySession.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4"
              >
                <div>
                  <p className="font-mono text-sm font-semibold">{recoverySession.id}</p>
                  <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                    생성 {formatSessionDate(recoverySession.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-full bg-[color:var(--accent-soft)] px-4 py-2 text-[color:var(--accent-strong)]">
                    {sessionStatusLabel(recoverySession.status)}
                  </span>
                  <span className="rounded-full border border-[color:var(--border)] px-4 py-2">
                    {sessionSourceLabel(recoverySession.sourceType)}
                  </span>
                  <Link
                    href={`/sessions/${recoverySession.id}`}
                    className="rounded-full border border-[color:var(--border)] px-4 py-2 font-semibold transition hover:bg-white/70"
                  >
                    후속 결과 열기
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function InsufficientEvidenceRecovery({ snapshot }: { snapshot: SessionSnapshot }) {
  const router = useRouter();
  const result = snapshot.result;
  const [clarificationText, setClarificationText] = useState("");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (snapshot.session.status !== "insufficient_evidence" || result?.status !== "insufficient_evidence") {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (clarificationText.trim().length < minimumRecoveryClarificationLength) {
      setSubmissionError("다시 실행하기 전에 짧은 보완 설명을 적어 주세요.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const formData = new FormData();
      formData.set("mode", "clarification");
      formData.set("clarificationText", clarificationText);

      const response = await fetch(`/api/sessions/${snapshot.session.id}/recover`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as RecoveryResponse;

      if (!response.ok || !payload?.sessionId) {
        setSubmissionError(payload?.message ?? "보완 실행을 시작하지 못했습니다.");
        return;
      }

      router.push(`/sessions/${payload.sessionId}`);
    } catch {
      setSubmissionError("보완 실행을 시작하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            보완 실행
          </p>
          <h2 className="mt-3 text-2xl font-semibold">빠진 정보를 덧붙여 다시 실행하세요</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            기존 입력은 유지한 채 이 보완 설명만 덧붙여 새 결과를 만들 수 있습니다. 처음부터 다시 입력할 필요는 없습니다.
          </p>
        </div>
        <div className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm">
          현재 흐름 안에서 바로 이어집니다
        </div>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold">보완 설명</span>
          <textarea
            value={clarificationText}
            maxLength={recoveryClarificationMaxLength}
            disabled={isSubmitting}
            onChange={(event) => setClarificationText(event.target.value)}
            placeholder="첫 결과에서 부족했던 업무 범위, 사용 도구, 산업 맥락, 성과 내용을 구체적으로 적어 주세요."
            className="mt-2 min-h-32 w-full rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)]"
          />
          <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
            {clarificationText.length}/{recoveryClarificationMaxLength}자
          </p>
        </label>

        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
          <p className="text-sm font-semibold">이 질문부터 답해 보세요</p>
          <ul className="mt-3 space-y-2 text-sm text-[color:var(--muted-foreground)]">
            {result.followUpQuestions.map((question) => (
              <li key={question}>• {question}</li>
            ))}
          </ul>
        </div>

        {submissionError ? (
          <p className="text-sm text-red-600">{submissionError}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "보완 실행 시작 중..." : "보완 정보로 다시 실행"}
          </button>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            새 결과에는 이 보완 전 시도와의 연결 정보가 그대로 남습니다.
          </p>
        </div>
      </form>
    </section>
  );
}

function ParserFailureRecovery({ snapshot }: { snapshot: SessionSnapshot }) {
  const router = useRouter();
  const result = snapshot.result;
  const parserFailureResult =
    snapshot.session.status === "parser_failure" && result?.status === "parser_failure"
      ? result
      : null;
  const [recoveryMode, setRecoveryMode] = useState<ParserFailureRecoveryMode>(() =>
    parserFailureResult?.requiredAction === "paste_text"
      ? "pasted_text"
      : "file_upload",
  );
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  if (!parserFailureResult) {
    return null;
  }

  const activeResult = parserFailureResult;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !activeResult.retryable ||
      activeResult.requiredAction === "contact_support"
    ) {
      setSubmissionError("이 파일 읽기 실패는 이 화면에서 바로 재시도할 수 없습니다.");
      return;
    }

    if (recoveryMode === "pasted_text" && resumeText.trim().length < minimumRecoveryResumeTextLength) {
      setSubmissionError("다시 실행하기 전에 더 충분한 이력서 텍스트를 붙여 넣어 주세요.");
      return;
    }

    if (recoveryMode === "file_upload" && !resumeFile) {
      setSubmissionError("다시 시도하려면 교체할 PDF, DOCX, TXT 파일을 선택해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const formData = new FormData();
      formData.set("mode", recoveryMode);

      if (recoveryMode === "pasted_text") {
        formData.set("resumeText", resumeText);
      } else if (resumeFile) {
        formData.set("resumeFile", resumeFile);
      }

      const response = await fetch(`/api/sessions/${snapshot.session.id}/recover`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as RecoveryResponse;

      if (!response.ok || !payload?.sessionId) {
        setSubmissionError(payload?.message ?? "파일 복구 실행을 시작하지 못했습니다.");
        return;
      }

      router.push(`/sessions/${payload.sessionId}`);
    } catch {
      setSubmissionError("파일 복구 실행을 시작하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (
    !activeResult.retryable ||
    activeResult.requiredAction === "contact_support"
  ) {
    return (
      <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            복구 실행
          </p>
          <h2 className="mt-3 text-2xl font-semibold">수동 확인이 필요합니다</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            이 파일 읽기 실패는 화면에서 바로 복구할 수 없도록 표시되어 있습니다. 기술 정보를 먼저 확인한 뒤 새로 시작할지 결정해 주세요.
          </p>
        </div>
        <div className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm">
          기존 실패 기록은 유지됩니다
        </div>
      </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            복구 실행
          </p>
          <h2 className="mt-3 text-2xl font-semibold">새 입력으로 다시 시도하세요</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            더 깨끗한 파일로 교체하거나 정리된 텍스트를 직접 붙여 넣어 새 결과를 만들 수 있습니다. 기존 실패 기록은 그대로 남습니다.
          </p>
        </div>
        <div className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm">
          기존 실패 기록은 유지됩니다
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
        <p className="text-sm font-semibold">먼저 이렇게 해 보세요</p>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          {activeResult.requiredAction === "paste_text"
            ? "원본 파일을 안정적으로 읽지 못한다면 정리된 텍스트를 직접 붙여 넣는 편이 빠릅니다."
            : "우선 교체 파일을 다시 올려 보고, 계속 불안정하면 텍스트 붙여넣기로 넘어가세요."}
        </p>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
          <p className="text-sm font-semibold">복구 입력 방식 선택</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[color:var(--border)] px-4 py-2">
              <input
                type="radio"
                name="parserFailureRecoveryMode"
                value="file_upload"
                checked={recoveryMode === "file_upload"}
                disabled={isSubmitting}
                className="accent-[color:var(--accent)]"
                onChange={() => setRecoveryMode("file_upload")}
              />
              교체 파일 업로드
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[color:var(--border)] px-4 py-2">
              <input
                type="radio"
                name="parserFailureRecoveryMode"
                value="pasted_text"
                checked={recoveryMode === "pasted_text"}
                disabled={isSubmitting}
                className="accent-[color:var(--accent)]"
                onChange={() => setRecoveryMode("pasted_text")}
              />
              정리된 텍스트 붙여넣기
            </label>
          </div>
        </div>

        {recoveryMode === "file_upload" ? (
          <label className="block">
            <span className="text-sm font-semibold">교체할 이력서 파일</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              disabled={isSubmitting}
              className="mt-2 block w-full rounded-[1.5rem] border border-dashed border-[color:var(--border)] bg-white/80 px-4 py-6 text-sm"
              onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
            />
            <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
              더 깨끗한 PDF, DOCX, TXT 파일을 올려 주세요. 최대 8MB입니다.
            </p>
          </label>
        ) : (
          <label className="block">
            <span className="text-sm font-semibold">정리된 이력서 텍스트</span>
            <textarea
              value={resumeText}
              maxLength={recoveryResumeTextMaxLength}
              disabled={isSubmitting}
              onChange={(event) => setResumeText(event.target.value)}
              placeholder="업무 범위, 사용 도구, 산업 맥락, 성과가 드러나도록 텍스트 버전을 붙여 넣어 주세요."
              className="mt-2 min-h-32 w-full rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)]"
            />
            <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
              {resumeText.length}/{recoveryResumeTextMaxLength}자
            </p>
          </label>
        )}

        {submissionError ? (
          <p className="text-sm text-red-600">{submissionError}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "복구 실행 시작 중..."
              : recoveryMode === "file_upload"
                ? "교체 파일로 다시 실행"
                : "텍스트로 다시 실행"}
          </button>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            새 결과에는 이 파일 읽기 실패 시도와의 연결 정보가 그대로 남습니다.
          </p>
        </div>
      </form>
    </section>
  );
}

function SessionRecovery({ snapshot }: { snapshot: SessionSnapshot }) {
  if (snapshot.session.status === "insufficient_evidence") {
    return <InsufficientEvidenceRecovery snapshot={snapshot} />;
  }

  if (snapshot.session.status === "parser_failure") {
    return <ParserFailureRecovery snapshot={snapshot} />;
  }

  return null;
}

function SessionFeedback({
  snapshot,
  onRefresh,
}: {
  snapshot: SessionSnapshot;
  onRefresh: () => Promise<void>;
}) {
  const [selectedSentiment, setSelectedSentiment] = useState<FeedbackSentiment | null>(
    snapshot.feedbackEvent?.sentiment ?? null,
  );
  const [note, setNote] = useState(snapshot.feedbackEvent?.note ?? "");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const savedFeedback = snapshot.feedbackEvent;

  useEffect(() => {
    setSelectedSentiment(savedFeedback?.sentiment ?? null);
    setNote(savedFeedback?.note ?? "");
  }, [savedFeedback?.sentiment, savedFeedback?.note, savedFeedback?.updatedAt]);

  if (!feedbackEligibleSessionStatuses.has(snapshot.session.status) || !snapshot.result) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSentiment) {
      setSubmissionError("이번 결과가 도움이 되었는지 먼저 선택해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const response = await fetch(`/api/sessions/${snapshot.session.id}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sentiment: selectedSentiment,
          note,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setSubmissionError(payload?.message ?? "피드백을 저장하지 못했습니다.");
        return;
      }

      await onRefresh();
    } catch {
      setSubmissionError("피드백을 저장하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            결과 피드백
          </p>
          <h2 className="mt-3 text-2xl font-semibold">이번 결과가 실제로 도움이 되었나요?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            결과가 나온 항목마다 최신 피드백 1개를 저장할 수 있고, 다시 저장하면 이전 내용이 교체됩니다.
          </p>
        </div>
        {savedFeedback ? (
          <div className="rounded-full bg-[color:var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-strong)]">
            {feedbackSentimentLabel(savedFeedback.sentiment)}
          </div>
        ) : (
          <div className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm">
            아직 저장되지 않음
          </div>
        )}
      </div>

      {savedFeedback ? (
        <div className="mt-5 rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
          <p className="text-sm font-semibold">
            저장된 피드백: {feedbackSentimentLabel(savedFeedback.sentiment)}
          </p>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            업데이트 {formatSessionDate(savedFeedback.updatedAt)}
          </p>
          {savedFeedback.note ? (
            <p className="mt-3 text-sm leading-7">{savedFeedback.note}</p>
          ) : (
            <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
              메모는 함께 저장되지 않았습니다.
            </p>
          )}
        </div>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="flex flex-wrap gap-3">
          {(["helpful", "not_helpful"] as const).map((sentiment) => {
            const isSelected = selectedSentiment === sentiment;

            return (
              <button
                key={sentiment}
                type="button"
                disabled={isSubmitting}
                onClick={() => setSelectedSentiment(sentiment)}
                className={
                  isSelected
                    ? "rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-full border border-[color:var(--border)] px-4 py-2 text-sm transition hover:bg-white/80"
                }
              >
                {feedbackSentimentLabel(sentiment)}
              </button>
            );
          })}
        </div>

        <label className="block">
          <span className="text-sm font-semibold">메모 남기기</span>
          <textarea
            value={note}
            maxLength={500}
            disabled={isSubmitting}
            onChange={(event) => setNote(event.target.value)}
            placeholder="어떤 점이 도움이 되었는지, 또는 어디가 아쉬웠는지 간단히 적어 주세요."
            className="mt-2 min-h-28 w-full rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)]"
          />
          <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
            {note.length}/500자
          </p>
        </label>

        {submissionError ? (
          <p className="text-sm text-red-600">{submissionError}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? savedFeedback
                ? "피드백 업데이트 중..."
                : "피드백 저장 중..."
              : savedFeedback
                ? "피드백 수정"
                : "피드백 저장"}
          </button>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            새로고침하면 가장 최근에 저장한 피드백 상태가 반영됩니다.
          </p>
        </div>
      </form>
    </section>
  );
}

export function SessionView({ initialSnapshot }: { initialSnapshot: SessionSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const isTerminal = terminalSessionStatuses.has(snapshot.session.status);

  const refreshSnapshot = useEffectEvent(async () => {
    const payload = await fetchSessionSnapshot(snapshot.session.id);

    if (!payload) {
      return;
    }

    setSnapshot(payload);
  });

  async function reloadSnapshot() {
    const payload = await fetchSessionSnapshot(snapshot.session.id);

    if (!payload) {
      return;
    }

    setSnapshot(payload);
  }

  useEffect(() => {
    if (isTerminal) {
      return;
    }

    void refreshSnapshot();

    const interval = window.setInterval(() => {
      void refreshSnapshot();
    }, 2500);

    return () => {
      window.clearInterval(interval);
    };
  }, [isTerminal]);

  return (
    <div className="space-y-6">
      <SessionOverview snapshot={snapshot} />

      {!isTerminal ? (
        <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
          <h2 className="text-lg font-semibold">아직 결과를 만드는 중입니다</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            대기, 읽기, 프로필 정리, 추천 생성 단계를 지나면서 이 화면이 자동으로 갱신됩니다. 로컬 개발에서는 `npm run dev`와 `npm run worker:dev`가 모두 필요합니다.
          </p>
        </div>
      ) : null}

      <SessionResult result={snapshot.result} />

      <SessionRecovery snapshot={snapshot} />

      <SessionFeedback snapshot={snapshot} onRefresh={reloadSnapshot} />

      <CandidateProfileView candidateProfile={snapshot.candidateProfile} />

      <SessionLineage snapshot={snapshot} />

      <SessionDebugDetails snapshot={snapshot} />

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/sessions"
          className="rounded-full border border-[color:var(--border)] px-4 py-2 transition hover:bg-white/70"
        >
          최근 결과 보기
        </Link>
        <Link
          href="/"
          className="rounded-full border border-[color:var(--border)] px-4 py-2 transition hover:bg-white/70"
        >
          새 이력서로 시작
        </Link>
        <a
          href="/api/health"
          className="rounded-full border border-[color:var(--border)] px-4 py-2 transition hover:bg-white/70"
        >
          시스템 상태 보기
        </a>
      </div>
    </div>
  );
}
