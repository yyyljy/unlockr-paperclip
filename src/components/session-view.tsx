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

function isModelAnalysisFailure(snapshot: SessionSnapshot) {
  return (
    snapshot.session.latestErrorCode === "model_provider_not_configured" ||
    snapshot.session.latestErrorCode === "model_recommendation_failed" ||
    snapshot.session.latestErrorCode === "model_recommendation_timed_out" ||
    snapshot.latestRun?.errorCode === "model_provider_not_configured" ||
    snapshot.latestRun?.errorCode === "model_recommendation_failed" ||
    snapshot.latestRun?.errorCode === "model_recommendation_timed_out"
  );
}

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
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
    case "insufficient":
      return "Insufficient confidence";
  }
}

function evidenceQualityLabel(evidenceQuality: ReadyEvidenceQuality) {
  switch (evidenceQuality) {
    case "strong":
      return "Strong evidence";
    case "mixed":
      return "Mixed evidence";
    case "thin":
      return "Thin evidence";
  }
}

function evidenceQualitySummary(evidenceQuality: ReadyEvidenceQuality) {
  switch (evidenceQuality) {
    case "strong":
      return "Multiple signals point in the same direction, so this result is ready for review and action.";
    case "mixed":
      return "The direction is visible, but role depth or tool context is still incomplete, so review the gaps first.";
    case "thin":
      return "There is a plausible direction here, but the evidence is narrow. Treat it as a starting point and fill in the missing detail first.";
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
      return "Model-backed path";
    case "fallback":
      return "Fallback rules path";
    case null:
      return "No recommendation path";
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
      return provider ?? "Model";
  }
}

function recommendationPathSummary(input: {
  recommendationPath: RecommendationPath;
  pathContext: RecommendationPathContext;
}) {
  if (input.recommendationPath === "model_backed") {
    return {
      title: "This result passed through the model-backed path",
      detail:
        "This result was produced through the model-backed path together with stored evidence sentences. It is still best to review the evidence and gaps before acting on it.",
      tone: "accent" as const,
    };
  }

  if (input.pathContext?.status === "fallback_timeout") {
    return {
      title: "The model timed out and the result was switched to fallback rules",
      detail: `${pathProviderLabel(
        input.pathContext.attemptedProvider,
      )} did not finish within the time limit, so this result was generated with the fallback rules path. Review the evidence below before treating it like a personalized model interpretation.`,
      tone: "warning" as const,
    };
  }

  if (input.pathContext?.status === "fallback_error") {
    return {
      title: "A model-path error occurred, so fallback rules were used",
      detail: `${pathProviderLabel(
        input.pathContext.attemptedProvider,
      )} hit an error, so this result was generated with the fallback rules path. Treat the direction as guidance and review both the evidence and the cautions below.`,
      tone: "neutral" as const,
    };
  }

  return {
    title: "This result was generated with fallback rules",
    detail:
      "This score was computed from roles, tools, and outcome signals directly visible in the resume. Review the evidence sentences below before interpreting it.",
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
      ? `More detail is needed for ${snapshot.session.candidateLabel}`
      : "More detail is needed before recommending a direction";
  }

  if (snapshot.session.status === "parser_failure") {
    return "The uploaded file could not be read";
  }

  if (snapshot.session.status === "failed") {
    return isModelAnalysisFailure(snapshot)
      ? "AI analysis could not finish"
      : "Processing stopped before a result could be created";
  }

  return snapshot.session.candidateLabel
    ? `Preparing the result for ${snapshot.session.candidateLabel}`
    : "Unlockr is preparing the result";
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
    return isModelAnalysisFailure(snapshot)
      ? (snapshot.session.latestErrorMessage ??
          "The model-backed analysis failed before a result could be created.")
      : (snapshot.session.latestErrorMessage ??
          "The run stopped because of a system processing issue before a grounded result could be shown.");
  }

  if (!snapshot.latestRun) {
    return "The request was accepted and is waiting for the first job to start.";
  }

  if (snapshot.latestRun.stage === "parse") {
    return "The system is reading text from the resume and organizing the key information.";
  }

  return "The system is turning the parsed content into a profile, recommended directions, and next actions.";
}

function sessionStatusDetail(snapshot: SessionSnapshot) {
  switch (snapshot.session.status) {
    case "ready":
      return snapshot.result?.status === "ready"
        ? `Prepared ${snapshot.result.recommendations.length} recommendation paths with ${evidenceQualityLabel(snapshot.result.summary.evidenceQuality).toLowerCase()}.`
        : "The result is ready to review.";
    case "insufficient_evidence":
      return "Some possible directions were visible, but the current information is not strong enough for a confident recommendation.";
    case "parser_failure":
      return "File reading stopped at the first stage, so the UI shows recovery options instead of forcing a recommendation.";
    case "failed":
      return isModelAnalysisFailure(snapshot)
        ? "This session stopped during the model-backed recommendation step, so no fallback result was generated."
        : "This session stopped because of a system error, not because the resume lacked detail.";
    case "queued":
      return "Waiting in the job queue.";
    case "parsing":
      return "Reading and organizing resume text.";
    case "analyzing":
      return "Building the profile and recommendation paths.";
  }
}

function sessionNextAction(snapshot: SessionSnapshot) {
  if (snapshot.result?.status === "ready") {
    const topRecommendation = snapshot.result.recommendations[0];
    const nextStep = topRecommendation?.nextSteps[0];

    if (nextStep) {
      return {
        title: nextStep.title,
        detail: `${nextStep.detail} ${nextStep.timeline} · ${nextStep.effort} effort.`,
        tone: "accent" as const,
      };
    }

    return {
      title: "Start with the highest-ranked direction",
      detail:
        "Review the evidence for the most likely direction first, then move through its gaps and next actions in order.",
      tone: "accent" as const,
    };
  }

  if (snapshot.result?.status === "insufficient_evidence") {
    return {
      title: "Fill in the missing detail first",
      detail:
        "Add missing detail such as scope of work, tools used, industry context, and outcomes in the clarification form below, then run it again.",
      tone: "neutral" as const,
    };
  }

  if (snapshot.result?.status === "parser_failure") {
    switch (snapshot.result.requiredAction) {
      case "paste_text":
        return {
          title: "Retry with cleaned text",
          detail:
            "Instead of relying on file parsing, paste cleaned resume text into the recovery form below to create a new result while keeping the original failure record.",
          tone: "danger" as const,
        };
      case "reupload":
        return {
          title: "Upload a cleaner replacement file",
          detail:
            "Upload a replacement PDF, DOCX, or TXT file with cleaner text extraction quality and generate a new result.",
          tone: "neutral" as const,
        };
      case "contact_support":
        return {
          title: "Review the technical details and handle it manually",
          detail:
            "This failure is marked as not retryable from the UI, so review the technical details below before deciding what to do next.",
          tone: "danger" as const,
        };
    }
  }

  if (snapshot.session.status === "failed") {
    return {
      title: isModelAnalysisFailure(snapshot)
        ? "Review the AI failure message first"
        : "Review the technical state first",
      detail: isModelAnalysisFailure(snapshot)
        ? "The model-backed step failed before Unlockr could produce a result. Review the error below, then retry after fixing provider setup, connectivity, or model availability."
        : "Reviewing the technical details below before retrying or handing it off helps preserve the original failure context.",
      tone: "danger" as const,
    };
  }

  return {
    title: "Please wait while the result is being prepared",
    detail:
      "This page refreshes automatically while the session is queued, parsing, or analyzing.",
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
      return "Address now";
    case "soon":
      return "Address soon";
    case "later":
      return "Address later";
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
        <h2 className="text-lg font-semibold">Structured Profile</h2>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          No structured profile has been saved yet.
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
              Structured Profile
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              {candidateProfile.headline?.value ?? "The profile was organized before a summary headline was available."}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              Version {candidateProfile.profileVersion} · Created{" "}
              {formatSessionDate(candidateProfile.createdAt)}
            </p>
          </div>
          <div className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm">
            {candidateProfile.sourceKind === "resume_text" ? "Pasted Text" : "File Upload"}
          </div>
        </div>

        {candidateProfile.coverageNotes.length > 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
            <p className="text-sm font-semibold">Coverage Notes</p>
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
          title="Role History"
          emptyText="No role-history sentences were extracted."
          signals={candidateProfile.roleHistory}
        />
        <CandidateProfileSection
          title="Role Signals"
          emptyText="No role signals were extracted."
          signals={candidateProfile.roleSignals}
        />
        <CandidateProfileSection
          title="Skills and Tools"
          emptyText="No skill or tool information was extracted."
          signals={candidateProfile.skills}
        />
        <CandidateProfileSection
          title="Domain Signals"
          emptyText="No domain signals were extracted."
          signals={candidateProfile.domainSignals}
        />
        <CandidateProfileSection
          title="Achievement Snippets"
          emptyText="No achievement snippets were extracted."
          signals={candidateProfile.achievements}
        />
        <CandidateProfileSection
          title="Education and Credentials"
          emptyText="No education or credential information was extracted."
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
            Recommendation {recommendation.rank}
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
          Why this fit
        </p>
        <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
          {recommendation.confidence.explanation}
        </p>
      </div>

      <p className="mt-4 text-sm leading-7">{recommendation.rationale}</p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold">Directly observed experience</p>
          <ul className="mt-2 space-y-2 text-sm text-[color:var(--muted-foreground)]">
            {recommendation.detectedExperience.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Additional inferred potential</p>
          <ul className="mt-2 space-y-2 text-sm text-[color:var(--muted-foreground)]">
            {recommendation.inferredPotential.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold">Evidence sentences</p>
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
          <p className="text-sm font-semibold">Next actions</p>
          <div className="mt-2 space-y-3">
            {recommendation.nextSteps.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 text-sm"
              >
                <p className="font-medium">{step.title}</p>
                <p className="mt-1 text-[color:var(--muted-foreground)]">{step.detail}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                  {step.timeline} · {step.effort} effort
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
          <p className="text-sm font-semibold">Gaps to address first</p>
          {recommendation.gaps.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              No immediate blocking gaps were identified for this direction.
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
          <p className="text-sm font-semibold">Cautions</p>
          {recommendation.risks.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              No major additional cautions were flagged.
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
        <h2 className="text-lg font-semibold">The result is still being prepared</h2>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          Terminal-state result data has not been saved yet.
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
                Start here
              </p>
              <h2 className="mt-3 text-2xl font-semibold">
                {featuredRecommendation?.roleTitle ?? "Highest-priority recommendation"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
                Review the evidence and cautions for this direction first, then compare it with the other options below.
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
                How to read this result
              </p>
              <h2 className="mt-3 text-2xl font-semibold">Check why this direction was recommended before anything else</h2>
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
                Recommendation count
              </p>
              <p className="mt-2 text-3xl font-semibold">{result.recommendations.length}</p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                Start with the top-ranked direction and use the others as alternatives or adjacent paths.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                Review order
              </p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                Confirm that the evidence matches the resume first, then move through the gaps and next actions.
              </p>
            </div>
          </div>
        </section>

        {otherRecommendations.length > 0 ? (
          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                Other directions to compare
              </p>
              <h2 className="mt-3 text-2xl font-semibold">Lower-ranked recommendations worth comparing</h2>
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
        <h2 className="text-2xl font-semibold">More detail is needed</h2>
        <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
          {result.userMessage}
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold">What is blocking confidence right now</p>
            <ul className="mt-2 space-y-2 text-sm text-[color:var(--muted-foreground)]">
              {result.blockingFindings.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Follow-up questions</p>
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
      <h2 className="text-2xl font-semibold">The run stopped during file parsing</h2>
      <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
        {result.userMessage}
      </p>
      <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
        Use the recovery tools below to retry with a replacement file or cleaned text. The original failure record is preserved.
      </p>
      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-[color:var(--accent-soft)] px-4 py-2 text-[color:var(--accent-strong)]">
          Error code: {result.errorCode}
        </span>
        <span className="rounded-full border border-[color:var(--border)] px-4 py-2">
          Recommended action: {result.requiredAction}
        </span>
        <span className="rounded-full border border-[color:var(--border)] px-4 py-2">
          Retryable: {result.retryable ? "Yes" : "No"}
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
            Session Overview
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
            Next best action
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
            Current status
          </p>
          <p className="mt-3 text-sm leading-7">{currentStatusDetail}</p>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            Input received
          </p>
          <p className="mt-3 text-sm font-semibold">
            {snapshot.session.candidateLabel ?? "Session created without a name or note"}
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            Input source: {sessionSourceLabel(snapshot.session.sourceType)}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            Timeline
          </p>
          <p className="mt-3 text-sm font-semibold">
            Started {formatSessionDate(snapshot.session.createdAt)}
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            Updated {formatSessionDate(snapshot.session.updatedAt)}
          </p>
        </div>
      </div>
    </section>
  );
}

function SessionDebugDetails({ snapshot }: { snapshot: SessionSnapshot }) {
  const debugItems = [
    { label: "Session ID", value: snapshot.session.id },
    {
      label: "Latest run status",
      value: snapshot.latestRun
        ? `${snapshot.latestRun.stage} · ${snapshot.latestRun.status}`
        : "No run has been created yet",
    },
    {
      label: "Queue job ID",
      value: snapshot.latestRun?.queueJobId ?? "Waiting",
    },
    {
      label: "Contract version",
      value: snapshot.session.contractVersion ?? "Waiting",
    },
    {
      label: "Parser version",
      value: snapshot.session.parserVersion ?? "Waiting",
    },
    {
      label: "Recommendation path",
      value: recommendationPathLabel(snapshot.result?.metadata.recommendationPath ?? null),
    },
    {
      label: "Model provider",
      value: snapshot.result?.metadata.model?.provider ?? "Waiting",
    },
    {
      label: "Model version",
      value: snapshot.session.modelVersion ?? "Waiting",
    },
    {
      label: "Prompt version",
      value: snapshot.session.promptVersion ?? "Waiting",
    },
    {
      label: "Taxonomy version",
      value: snapshot.session.taxonomyVersion ?? "Waiting",
    },
    {
      label: "Recommendation set ID",
      value: snapshot.recommendationSet?.id ?? "Not created yet",
    },
  ];

  if (snapshot.latestRun?.errorCode) {
    debugItems.push({
      label: "Latest run error",
      value: `${snapshot.latestRun.errorCode}${
        snapshot.latestRun.errorMessage ? ` · ${snapshot.latestRun.errorMessage}` : ""
      }`,
    });
  } else if (snapshot.session.latestErrorCode) {
    debugItems.push({
      label: "Latest result error",
      value: `${snapshot.session.latestErrorCode}${
        snapshot.session.latestErrorMessage ? ` · ${snapshot.session.latestErrorMessage}` : ""
      }`,
    });
  }

  return (
    <details className="rounded-[2rem] border border-[color:var(--border)] bg-white/80 p-6">
      <summary className="cursor-pointer list-none text-lg font-semibold">
        Technical Details
      </summary>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--muted-foreground)]">
        Raw identifiers and execution-state details live here so the main page can stay focused on the result and the next action.
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
      ? "This session continues from an earlier parser-failure result"
      : "This session continues from an earlier clarification-needed result";
  const retriedFromDescription =
    snapshot.retriedFromSession?.status === "parser_failure"
      ? "This run restarted with replacement input after the earlier upload could not be read."
      : "This run restarted after adding extra clarification to the original input.";

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
          Linked Sessions
        </p>
        <h2 className="mt-3 text-2xl font-semibold">See where this session came from and what followed it</h2>
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
              Open previous session {snapshot.retriedFromSession.id}
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
          <p className="text-sm font-semibold">Follow-up sessions started from this result</p>
          <div className="mt-4 space-y-3">
            {snapshot.recoverySessions.map((recoverySession) => (
              <div
                key={recoverySession.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4"
              >
                <div>
                  <p className="font-mono text-sm font-semibold">{recoverySession.id}</p>
                  <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                    Created {formatSessionDate(recoverySession.createdAt)}
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
                    Open follow-up session
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
      setSubmissionError("Add a short clarification before retrying.");
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
        setSubmissionError(payload?.message ?? "Could not start the clarification retry.");
        return;
      }

      router.push(`/sessions/${payload.sessionId}`);
    } catch {
      setSubmissionError("Could not start the clarification retry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            Clarification Retry
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Add the missing detail and run it again</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            The original input stays in place. This retry creates a new result using only the added clarification, so there is no need to start over.
          </p>
        </div>
        <div className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm">
          Continues inside the current session flow
        </div>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold">Clarification</span>
          <textarea
            value={clarificationText}
            maxLength={recoveryClarificationMaxLength}
            disabled={isSubmitting}
            onChange={(event) => setClarificationText(event.target.value)}
            placeholder="Add concrete detail about scope, tools, industry context, or outcomes that were missing from the first result."
            className="mt-2 min-h-32 w-full rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)]"
          />
          <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
            {clarificationText.length}/{recoveryClarificationMaxLength} characters
          </p>
        </label>

        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
          <p className="text-sm font-semibold">Start by answering these questions</p>
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
            {isSubmitting ? "Starting clarification retry..." : "Retry with clarification"}
          </button>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            The new result keeps the linkage back to this pre-clarification attempt.
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
      setSubmissionError("This parser failure cannot be retried directly from this screen.");
      return;
    }

    if (recoveryMode === "pasted_text" && resumeText.trim().length < minimumRecoveryResumeTextLength) {
      setSubmissionError("Paste a more complete resume text before retrying.");
      return;
    }

    if (recoveryMode === "file_upload" && !resumeFile) {
      setSubmissionError("Choose a replacement PDF, DOCX, or TXT file before retrying.");
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
        setSubmissionError(payload?.message ?? "Could not start the file recovery retry.");
        return;
      }

      router.push(`/sessions/${payload.sessionId}`);
    } catch {
      setSubmissionError("Could not start the file recovery retry.");
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
            Recovery Retry
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Manual review is required</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            This parser failure is marked as not directly recoverable from the UI. Review the technical details first, then decide whether to start over manually.
          </p>
        </div>
        <div className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm">
          The original failure record is preserved
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
            Recovery Retry
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Retry with new input</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            Replace the file with a cleaner version or paste cleaned text directly to create a new result. The original failure record stays intact.
          </p>
        </div>
        <div className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm">
          The original failure record is preserved
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
        <p className="text-sm font-semibold">Suggested first step</p>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          {activeResult.requiredAction === "paste_text"
            ? "If the original file cannot be parsed reliably, pasting cleaned text is usually the fastest path."
            : "Start by uploading a cleaner replacement file. If parsing remains unstable, switch to pasted text."}
        </p>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
          <p className="text-sm font-semibold">Choose a recovery input mode</p>
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
              Upload replacement file
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
              Paste cleaned text
            </label>
          </div>
        </div>

        {recoveryMode === "file_upload" ? (
          <label className="block">
            <span className="text-sm font-semibold">Replacement resume file</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              disabled={isSubmitting}
              className="mt-2 block w-full rounded-[1.5rem] border border-dashed border-[color:var(--border)] bg-white/80 px-4 py-6 text-sm"
              onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
            />
            <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
              Upload a cleaner PDF, DOCX, or TXT file. Maximum size is 8MB.
            </p>
          </label>
        ) : (
          <label className="block">
            <span className="text-sm font-semibold">Cleaned resume text</span>
            <textarea
              value={resumeText}
              maxLength={recoveryResumeTextMaxLength}
              disabled={isSubmitting}
              onChange={(event) => setResumeText(event.target.value)}
              placeholder="Paste a text version that clearly shows scope, tools, domain context, and outcomes."
              className="mt-2 min-h-32 w-full rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)]"
            />
            <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
              {resumeText.length}/{recoveryResumeTextMaxLength} characters
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
              ? "Starting recovery retry..."
              : recoveryMode === "file_upload"
                ? "Retry with replacement file"
                : "Retry with pasted text"}
          </button>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            The new result keeps the linkage back to this parser-failure attempt.
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
      setSubmissionError("Choose whether this result was helpful before submitting.");
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
        setSubmissionError(payload?.message ?? "Could not save the feedback.");
        return;
      }

      await onRefresh();
    } catch {
      setSubmissionError("Could not save the feedback.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            Result Feedback
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Was this result actually helpful?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            Each result stores one latest feedback state. Saving again replaces the earlier feedback for this session.
          </p>
        </div>
        {savedFeedback ? (
          <div className="rounded-full bg-[color:var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-strong)]">
            {feedbackSentimentLabel(savedFeedback.sentiment)}
          </div>
        ) : (
          <div className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm">
            Not saved yet
          </div>
        )}
      </div>

      {savedFeedback ? (
        <div className="mt-5 rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
          <p className="text-sm font-semibold">
            Saved feedback: {feedbackSentimentLabel(savedFeedback.sentiment)}
          </p>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            Updated {formatSessionDate(savedFeedback.updatedAt)}
          </p>
          {savedFeedback.note ? (
            <p className="mt-3 text-sm leading-7">{savedFeedback.note}</p>
          ) : (
            <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
              No note was saved with this feedback.
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
          <span className="text-sm font-semibold">Leave a note</span>
          <textarea
            value={note}
            maxLength={500}
            disabled={isSubmitting}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Briefly note what helped or what felt off."
            className="mt-2 min-h-28 w-full rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)]"
          />
          <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
            {note.length}/500 characters
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
                ? "Updating feedback..."
                : "Saving feedback..."
              : savedFeedback
                ? "Update feedback"
                : "Save feedback"}
          </button>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Refreshing will show the latest saved feedback state.
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
          <h2 className="text-lg font-semibold">The result is still being generated</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            This page refreshes automatically while the session moves through queueing, parsing, profiling, and recommendation generation. In local development, both `npm run dev` and `npm run worker:dev` must be running.
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
          View recent results
        </Link>
        <Link
          href="/start"
          className="rounded-full border border-[color:var(--border)] px-4 py-2 transition hover:bg-white/70"
        >
          Start with a new resume
        </Link>
        <a
          href="/api/health"
          className="rounded-full border border-[color:var(--border)] px-4 py-2 transition hover:bg-white/70"
        >
          Check system health
        </a>
      </div>
    </div>
  );
}
