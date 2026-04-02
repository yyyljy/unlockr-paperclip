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
                Summary
              </p>
              <h2 className="mt-3 text-2xl font-semibold">{result.summary.candidateHeadline}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
                {result.summary.fitSummary}
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

          <div className="mt-5 rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              Evidence quality
            </p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
              {evidenceQualitySummary(result.summary.evidenceQuality)}
            </p>
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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            Session
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{snapshot.session.id}</h1>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            Created {formatSessionDate(snapshot.session.createdAt)} · Updated{" "}
            {formatSessionDate(snapshot.session.updatedAt)}
          </p>
        </div>
        <div className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white">
          {sessionStatusLabel(snapshot.session.status)}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[2rem] border border-[color:var(--border)] bg-white/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            Intake
          </p>
          <p className="mt-3 text-sm">
            {sessionSourceLabel(snapshot.session.sourceType)}
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            {snapshot.session.candidateLabel || "No candidate label supplied"}
          </p>
        </div>
        <div className="rounded-[2rem] border border-[color:var(--border)] bg-white/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            Queue
          </p>
          <p className="mt-3 text-sm">
            {snapshot.latestRun
              ? `${snapshot.latestRun.stage} · ${snapshot.latestRun.status}`
              : "Run not created"}
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            Job ID: {snapshot.latestRun?.queueJobId ?? "pending"}
          </p>
        </div>
        <div className="rounded-[2rem] border border-[color:var(--border)] bg-white/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            Metadata
          </p>
          <p className="mt-3 text-sm">Contract {snapshot.session.contractVersion ?? "pending"}</p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            Parser {snapshot.session.parserVersion ?? "pending"}
          </p>
        </div>
      </div>

      <SessionLineage snapshot={snapshot} />

      {!isTerminal ? (
        <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
          <h2 className="text-lg font-semibold">Worker is still processing</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            Keep this page open while the session moves through queue, parsing, profile extraction, and recommendation states. Local development requires both `npm run dev` and `npm run worker:dev`.
          </p>
        </div>
      ) : null}

      <CandidateProfileView candidateProfile={snapshot.candidateProfile} />

      <SessionResult result={snapshot.result} />

      <SessionRecovery snapshot={snapshot} />

      <SessionFeedback snapshot={snapshot} onRefresh={reloadSnapshot} />

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
