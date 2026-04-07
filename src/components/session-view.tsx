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
type RecommendationConfidenceLabel = Extract<
  AnalysisResult,
  { status: "ready" }
>["recommendations"][number]["confidence"]["label"];
type RecommendationGapUrgency = Extract<AnalysisResult, { status: "ready" }>["recommendations"][number]["gaps"][number]["urgency"];
type RecommendationPath = AnalysisResult["metadata"]["recommendationPath"];
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
      return "Multiple signals line up across the source material, so these recommendations are ready for action with less verification work.";
    case "mixed":
      return "The direction is grounded, but some role depth or tool ownership is still missing. Review the flagged gaps and risks before acting.";
    case "thin":
      return "Unlockr found a plausible direction, but the proof base is narrow. Treat this as a starting point and close the missing evidence first.";
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
      return "Model-backed";
    case "fallback":
      return "Fallback rules";
    case null:
      return "No recommendation path";
  }
}

function recommendationPathBadgeClassName(path: Exclude<RecommendationPath, null>) {
  switch (path) {
    case "model_backed":
      return "border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]";
    case "fallback":
      return "border border-[color:var(--border)] bg-white/80 text-[color:var(--foreground)]";
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
      ? `${snapshot.session.candidateLabel} needs more detail`
      : "More detail needed before Unlockr can recommend a direction";
  }

  if (snapshot.session.status === "parser_failure") {
    return "Unlockr could not extract the uploaded resume";
  }

  if (snapshot.session.status === "failed") {
    return "Analysis stopped before a trustworthy result was produced";
  }

  return snapshot.session.candidateLabel
    ? `Analyzing ${snapshot.session.candidateLabel}`
    : "Unlockr is processing the resume";
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
      "Unlockr captured a non-parser failure before it could publish a recommendation summary."
    );
  }

  if (!snapshot.latestRun) {
    return "The session was created and is waiting for the worker to start the first processing step.";
  }

  if (snapshot.latestRun.stage === "parse") {
    return "Unlockr is extracting text from the source before it builds the candidate profile and role directions.";
  }

  return "Unlockr is turning the parsed source into a structured profile, ranked directions, and follow-up guidance.";
}

function sessionStatusDetail(snapshot: SessionSnapshot) {
  switch (snapshot.session.status) {
    case "ready":
      return snapshot.result?.status === "ready"
        ? `${snapshot.result.recommendations.length} ranked direction${
            snapshot.result.recommendations.length === 1 ? "" : "s"
          } with ${evidenceQualityLabel(snapshot.result.summary.evidenceQuality).toLowerCase()}.`
        : "The recommendation payload is ready for review.";
    case "insufficient_evidence":
      return "Unlockr found partial signals but will not stretch into a confident recommendation yet.";
    case "parser_failure":
      return "The first pass stopped at extraction, so Unlockr kept the session visible instead of guessing.";
    case "failed":
      return "This is a system failure state rather than an evidence-quality outcome.";
    case "queued":
      return "The run is waiting for the worker to begin.";
    case "parsing":
      return "The worker is extracting text from the resume source.";
    case "analyzing":
      return "The worker is building the profile and recommendation set.";
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
      title: "Review the top recommendation first",
      detail:
        "Start with the highest-ranked role direction, confirm the evidence snippets, and then decide whether to act on it.",
      tone: "accent" as const,
    };
  }

  if (snapshot.result?.status === "insufficient_evidence") {
    return {
      title: "Answer the missing questions below",
      detail:
        "Use the recovery form to add the missing responsibilities, tools, domains, or outcomes before rerunning the session.",
      tone: "neutral" as const,
    };
  }

  if (snapshot.result?.status === "parser_failure") {
    switch (snapshot.result.requiredAction) {
      case "paste_text":
        return {
          title: "Paste cleaned resume text",
          detail:
            "Bypass extraction with plain text in the recovery form below while keeping this failed upload available for debugging.",
          tone: "danger" as const,
        };
      case "reupload":
        return {
          title: "Retry with a cleaner file",
          detail:
            "Upload a replacement PDF, DOCX, or TXT file in the recovery flow below before starting a brand-new intake.",
          tone: "neutral" as const,
        };
      case "contact_support":
        return {
          title: "Use the manual debug flow",
          detail:
            "This failure was not marked retryable from the product surface, so inspect the debug section before retrying.",
          tone: "danger" as const,
        };
    }
  }

  if (snapshot.session.status === "failed") {
    return {
      title: "Inspect the debug section and health checks",
      detail:
        "Capture the failure metadata before retrying or escalating so the next run does not lose the original error context.",
      tone: "danger" as const,
    };
  }

  return {
    title: "Keep this page open",
    detail:
      "Unlockr refreshes this session while it moves through queue, parsing, and analysis work.",
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
        <h2 className="text-lg font-semibold">Candidate profile</h2>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          The worker has not persisted the structured profile yet.
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
              Candidate profile
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              {candidateProfile.headline?.value ?? "Profile extracted without a summary headline"}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              Version {candidateProfile.profileVersion} · Built{" "}
              {formatSessionDate(candidateProfile.createdAt)}
            </p>
          </div>
          <div className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm">
            {candidateProfile.sourceKind === "resume_text" ? "Pasted text" : "File upload"}
          </div>
        </div>

        {candidateProfile.coverageNotes.length > 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
            <p className="text-sm font-semibold">Coverage notes</p>
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
          title="Role history"
          emptyText="No role-history snippets were extracted."
          signals={candidateProfile.roleHistory}
        />
        <CandidateProfileSection
          title="Role signals"
          emptyText="No role-family signals were extracted."
          signals={candidateProfile.roleSignals}
        />
        <CandidateProfileSection
          title="Skills and tools"
          emptyText="No explicit skills or tools were extracted."
          signals={candidateProfile.skills}
        />
        <CandidateProfileSection
          title="Domain signals"
          emptyText="No reusable domain signals were extracted."
          signals={candidateProfile.domainSignals}
        />
        <CandidateProfileSection
          title="Achievement snippets"
          emptyText="No measurable outcome snippets were extracted."
          signals={candidateProfile.achievements}
        />
        <CandidateProfileSection
          title="Education and certifications"
          emptyText="No education or certification signals were extracted."
          signals={[
            ...candidateProfile.educationSignals,
            ...candidateProfile.certificationSignals,
          ]}
        />
      </div>
    </div>
  );
}

function SessionResult({ result }: { result: AnalysisResult | null }) {
  if (!result) {
    return (
      <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
        <h2 className="text-lg font-semibold">Waiting for result payload</h2>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          The queue worker has not written a terminal contract yet.
        </p>
      </div>
    );
  }

  if (result.status === "ready") {
    return (
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                Supporting evidence
              </p>
              <h2 className="mt-3 text-2xl font-semibold">Why Unlockr believes this direction</h2>
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
                Review the highest-ranked direction first, then use the later
                options as fallbacks or adjacent paths.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                How to read the page
              </p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                Confirm that the evidence snippets match the source, then use the
                gaps and risks before acting on the recommended next step.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          {result.recommendations.map((recommendation) => (
            <article
              key={recommendation.recommendationId}
              className="rounded-[2rem] border border-[color:var(--border)] bg-white/85 p-6 shadow-[0_10px_30px_rgba(18,19,20,0.05)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                    Rank {recommendation.rank}
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
                  Why this confidence level
                </p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                  {recommendation.confidence.explanation}
                </p>
              </div>

              <p className="mt-4 text-sm leading-7">{recommendation.rationale}</p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold">Detected experience</p>
                  <ul className="mt-2 space-y-2 text-sm text-[color:var(--muted-foreground)]">
                    {recommendation.detectedExperience.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold">Inferred potential</p>
                  <ul className="mt-2 space-y-2 text-sm text-[color:var(--muted-foreground)]">
                    {recommendation.inferredPotential.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold">Evidence snippets</p>
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
                  <p className="text-sm font-semibold">Next steps</p>
                  <div className="mt-2 space-y-3">
                    {recommendation.nextSteps.map((step) => (
                      <div
                        key={step.title}
                        className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 text-sm"
                      >
                        <p className="font-medium">{step.title}</p>
                        <p className="mt-1 text-[color:var(--muted-foreground)]">
                          {step.detail}
                        </p>
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
                  <p className="text-sm font-semibold">Suggested gaps to close</p>
                  {recommendation.gaps.length === 0 ? (
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      No immediate evidence gaps were flagged for this recommendation.
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
                  <p className="text-sm font-semibold">Decision risks</p>
                  {recommendation.risks.length === 0 ? (
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      No additional decision risks were flagged for this recommendation.
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
          ))}
        </section>
      </div>
    );
  }

  if (result.status === "insufficient_evidence") {
    return (
      <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
        <h2 className="text-2xl font-semibold">Insufficient evidence</h2>
        <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
          {result.userMessage}
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold">Blocking findings</p>
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
      <h2 className="text-2xl font-semibold">Parser failure state</h2>
      <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
        {result.userMessage}
      </p>
      <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
        Use the recovery action below to replace the file or paste cleaned text while keeping this
        failed session available for debugging.
      </p>
      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-[color:var(--accent-soft)] px-4 py-2 text-[color:var(--accent-strong)]">
          error: {result.errorCode}
        </span>
        <span className="rounded-full border border-[color:var(--border)] px-4 py-2">
          action: {result.requiredAction}
        </span>
        <span className="rounded-full border border-[color:var(--border)] px-4 py-2">
          retryable: {result.retryable ? "yes" : "no"}
        </span>
      </div>
    </section>
  );
}

function SessionOverview({ snapshot }: { snapshot: SessionSnapshot }) {
  const nextAction = sessionNextAction(snapshot);
  const currentStatusDetail = sessionStatusDetail(snapshot);
  const recommendationPath = snapshot.result?.metadata.recommendationPath ?? null;

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            Session overview
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
            {recommendationPath ? (
              <span
                className={`rounded-full border px-4 py-2 ${recommendationPathBadgeClassName(
                  recommendationPath,
                )}`}
              >
                {recommendationPathLabel(recommendationPath)}
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
            Next recommended action
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
            Intake received
          </p>
          <p className="mt-3 text-sm font-semibold">
            {snapshot.session.candidateLabel ?? "No candidate label supplied"}
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            Source: {sessionSourceLabel(snapshot.session.sourceType)}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            Session timing
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
      label: "Current run",
      value: snapshot.latestRun
        ? `${snapshot.latestRun.stage} · ${snapshot.latestRun.status}`
        : "Run not created",
    },
    {
      label: "Queue job ID",
      value: snapshot.latestRun?.queueJobId ?? "pending",
    },
    {
      label: "Contract version",
      value: snapshot.session.contractVersion ?? "pending",
    },
    {
      label: "Parser version",
      value: snapshot.session.parserVersion ?? "pending",
    },
    {
      label: "Recommendation path",
      value: recommendationPathLabel(snapshot.result?.metadata.recommendationPath ?? null),
    },
    {
      label: "Model provider",
      value: snapshot.result?.metadata.model?.provider ?? "pending",
    },
    {
      label: "Model version",
      value: snapshot.session.modelVersion ?? "pending",
    },
    {
      label: "Prompt version",
      value: snapshot.session.promptVersion ?? "pending",
    },
    {
      label: "Taxonomy version",
      value: snapshot.session.taxonomyVersion ?? "pending",
    },
    {
      label: "Recommendation set",
      value: snapshot.recommendationSet?.id ?? "not written",
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
      label: "Latest session error",
      value: `${snapshot.session.latestErrorCode}${
        snapshot.session.latestErrorMessage ? ` · ${snapshot.session.latestErrorMessage}` : ""
      }`,
    });
  }

  return (
    <details className="rounded-[2rem] border border-[color:var(--border)] bg-white/80 p-6">
      <summary className="cursor-pointer list-none text-lg font-semibold">
        Debug details
      </summary>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--muted-foreground)]">
        Raw identifiers, queue state, and contract lineage stay here so the
        first screen can stay focused on outcome and next action.
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
      ? "Recovered from a prior parser-failure run"
      : "Recovered from a prior insufficient-evidence run";
  const retriedFromDescription =
    snapshot.retriedFromSession?.status === "parser_failure"
      ? "This session restarted analysis after the earlier upload could not be extracted cleanly."
      : "This session reuses earlier source material plus added clarification.";

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
          Recovery lineage
        </p>
        <h2 className="mt-3 text-2xl font-semibold">How this session connects</h2>
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
              Open {snapshot.retriedFromSession.id}
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
          <p className="text-sm font-semibold">Recovery attempts started from this session</p>
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
                    Open recovery
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
      setSubmissionError("Add a short clarification before retrying the session.");
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
        setSubmissionError(payload?.message ?? "Failed to start the recovery session.");
        return;
      }

      router.push(`/sessions/${payload.sessionId}`);
    } catch {
      setSubmissionError("Failed to start the recovery session.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            Recovery action
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Add the missing context</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            Unlockr will reuse the existing source text, append this clarification, and open a
            fresh analysis session instead of sending you back to the blank intake form.
          </p>
        </div>
        <div className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm">
          Recovery stays inside the product
        </div>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold">Clarifying follow-up context</span>
          <textarea
            value={clarificationText}
            maxLength={recoveryClarificationMaxLength}
            disabled={isSubmitting}
            onChange={(event) => setClarificationText(event.target.value)}
            placeholder="Add the concrete responsibilities, tools, domains, and outcomes that were missing from the first pass."
            className="mt-2 min-h-32 w-full rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)]"
          />
          <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
            {clarificationText.length}/{recoveryClarificationMaxLength} characters
          </p>
        </label>

        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
          <p className="text-sm font-semibold">Suggested gaps to answer</p>
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
            {isSubmitting ? "Starting recovery..." : "Retry with clarification"}
          </button>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            The new session will preserve a link back to this insufficient-evidence attempt.
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
      setSubmissionError("This parser failure is not marked retryable from the session page.");
      return;
    }

    if (recoveryMode === "pasted_text" && resumeText.trim().length < minimumRecoveryResumeTextLength) {
      setSubmissionError("Paste more clean resume text before starting a recovery session.");
      return;
    }

    if (recoveryMode === "file_upload" && !resumeFile) {
      setSubmissionError("Select a replacement PDF, DOCX, or TXT file before retrying.");
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
        setSubmissionError(payload?.message ?? "Failed to start the recovery session.");
        return;
      }

      router.push(`/sessions/${payload.sessionId}`);
    } catch {
      setSubmissionError("Failed to start the recovery session.");
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
              Recovery action
            </p>
            <h2 className="mt-3 text-2xl font-semibold">Manual follow-up required</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
              Unlockr captured this parser failure but did not mark it as retryable from the
              product surface. Preserve this session for debugging and follow the operator
              workflow before starting a brand-new intake manually.
            </p>
          </div>
          <div className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm">
            Original failed session stays visible
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
            Recovery action
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Start a fresh parser retry</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            Replace the broken file with a cleaner upload or bypass extraction by pasting clean
            resume text directly. Unlockr will open a new linked session and keep this failed one
            available for release checks.
          </p>
        </div>
        <div className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm">
          Original failed session stays visible
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
        <p className="text-sm font-semibold">Suggested first move</p>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          {activeResult.requiredAction === "paste_text"
            ? "Paste cleaned text if the parser cannot reliably extract the original file."
            : "Try a replacement PDF, DOCX, or TXT export first, then fall back to pasted text if extraction stays brittle."}
        </p>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
          <p className="text-sm font-semibold">Choose the recovery input</p>
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
              Upload a cleaner PDF, DOCX, or TXT file. Limit: 8MB.
            </p>
          </label>
        ) : (
          <label className="block">
            <span className="text-sm font-semibold">Clean resume text</span>
            <textarea
              value={resumeText}
              maxLength={recoveryResumeTextMaxLength}
              disabled={isSubmitting}
              onChange={(event) => setResumeText(event.target.value)}
              placeholder="Paste the plain-text version of the resume, including responsibilities, tools, domains, and outcomes."
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
              ? "Starting recovery..."
              : recoveryMode === "file_upload"
                ? "Retry with replacement file"
                : "Retry with pasted text"}
          </button>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            The new session will preserve a link back to this parser-failure attempt.
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
      setSubmissionError("Choose whether the session outcome was helpful.");
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
        setSubmissionError(payload?.message ?? "Failed to save feedback.");
        return;
      }

      await onRefresh();
    } catch {
      setSubmissionError("Failed to save feedback.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            Session feedback
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Was this outcome useful?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            Save one operator-visible feedback state per terminal session. Resubmitting
            replaces the previous sentiment and note.
          </p>
        </div>
        {savedFeedback ? (
          <div className="rounded-full bg-[color:var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-strong)]">
            {feedbackSentimentLabel(savedFeedback.sentiment)}
          </div>
        ) : (
          <div className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm">
            Not captured yet
          </div>
        )}
      </div>

      {savedFeedback ? (
        <div className="mt-5 rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
          <p className="text-sm font-semibold">
            Saved {feedbackSentimentLabel(savedFeedback.sentiment).toLowerCase()} feedback
          </p>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            Updated {formatSessionDate(savedFeedback.updatedAt)}
          </p>
          {savedFeedback.note ? (
            <p className="mt-3 text-sm leading-7">{savedFeedback.note}</p>
          ) : (
            <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
              No note was attached to the current feedback state.
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
          <span className="text-sm font-semibold">Optional note</span>
          <textarea
            value={note}
            maxLength={500}
            disabled={isSubmitting}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Capture why this felt useful or where the recommendation missed."
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
            The latest submission is what the session page will show after refresh.
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
          <h2 className="text-lg font-semibold">Worker is still processing</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            Keep this page open while the session moves through queue, parsing, profile extraction, and recommendation states. Local development requires both `npm run dev` and `npm run worker:dev`.
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
          Review recent sessions
        </Link>
        <Link
          href="/"
          className="rounded-full border border-[color:var(--border)] px-4 py-2 transition hover:bg-white/70"
        >
          Start another session
        </Link>
        <a
          href="/api/health"
          className="rounded-full border border-[color:var(--border)] px-4 py-2 transition hover:bg-white/70"
        >
          Check health
        </a>
      </div>
    </div>
  );
}
