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
        : `Updated ${formatSessionDate(entry.feedbackEvent.updatedAt)}`,
    };
  }

  if (feedbackEligibleSessionStatuses.has(entry.session.status)) {
    return {
      label: "No Feedback Yet",
      detail: "This result is eligible for feedback, but none has been saved yet.",
    };
  }

  return {
    label: "Not Eligible Yet",
    detail: "Feedback is available only for ready, insufficient-evidence, and parser-failure sessions.",
  };
}

function sessionNote(entry: {
  session: RecentSessionEntry["session"];
  retriedFromSession: RecentSessionEntry["retriedFromSession"];
}) {
  if (entry.retriedFromSession) {
    if (entry.retriedFromSession.status === "parser_failure") {
      return `Recovery result linked from ${entry.retriedFromSession.id}. A replacement file or cleaned text was used after the original file could not be read.`;
    }

    return `Follow-up result linked from ${entry.retriedFromSession.id}. Additional clarification was added and the analysis was run again.`;
  }

  if (entry.session.latestErrorCode) {
    return `${entry.session.latestErrorCode}: ${
      entry.session.latestErrorMessage ?? "No additional error message was saved."
    }`;
  }

  switch (entry.session.status) {
    case "ready":
      return "Open the detail view to review the recommended directions, supporting evidence, and next actions.";
    case "insufficient_evidence":
      return "Open the detail view to see what is missing and which follow-up questions to answer.";
    case "parser_failure":
      return "Open the detail view to see why file parsing failed and how to retry.";
    case "failed":
      return "Open the detail view to inspect the failure reason and the remaining technical context.";
    default:
      return "The session is still moving through intake, parsing, or analysis.";
  }
}

function recoveryBadgeLabel(entry: RecentSessionEntry) {
  if (!entry.retriedFromSession) {
    return null;
  }

  return entry.retriedFromSession.status === "parser_failure"
    ? "File Recovery"
    : "Clarification Retry";
}

function outcomeSummaryCopy(status: OutcomeStatus) {
  switch (status) {
    case "ready":
      return "Reached a recommendation-ready result.";
    case "insufficient_evidence":
      return "More specific detail is needed before recommending a direction with confidence.";
    case "parser_failure":
      return "The file could not be read reliably, so new input is needed.";
    case "failed":
      return "The run stopped because of a system processing issue, not because the evidence was thin.";
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
    return `${sessionNote(entry)} This window also includes ${entry.recoveryAttemptCount} linked retry runs.`;
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
            Recent Results
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            Review recent career-direction results and live session status in one place
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--muted-foreground)] md:text-base">
            Reopen finished runs, retry sessions that need clarification or recovery, and save whether a result was actually useful.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/start"
              className="rounded-full bg-[color:var(--accent)] px-5 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Start Over with a New Resume
            </Link>
            <a
              href="/api/health"
              className="rounded-full border border-[color:var(--border)] px-5 py-3 transition hover:bg-white/70"
            >
              Check System Health
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-[2rem] border border-[color:var(--border)] bg-white/80 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              What You Can Do Here
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
              <li>Read the recent outcome mix first to quickly gauge whether the overall flow is healthy.</li>
              <li>Use the attention queue to focus only on results that need recovery or clarification.</li>
              <li>Open any detail screen to inspect evidence, next steps, and saved feedback.</li>
            </ul>
          </section>

          <section className="rounded-[2rem] border border-[color:var(--border)] bg-white/80 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              Current Scope
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
              <li>The summary and list include only the 25 most recently updated results.</li>
              <li>Search, filters, and bulk actions are not included yet.</li>
              <li>Only the latest feedback state is kept for each session, and a resubmission replaces the previous one.</li>
            </ul>
          </section>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--border)] bg-white/85 p-6 shadow-[0_10px_30px_rgba(18,19,20,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              Recent Summary
            </p>
            <h2 className="mt-2 text-2xl font-semibold md:text-3xl">
              Outcome distribution and processing speed
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--muted-foreground)]">
              Quickly read the ratio of ready, clarification-needed, and failed outcomes in the latest window and decide where to look first.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              Window Size
            </p>
            <p className="mt-2 text-3xl font-semibold">{healthSnapshot.windowSize}</p>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              Based on most recently updated sessions
            </p>
            <a
              href="#recent-sessions"
              className="mt-4 inline-flex rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-white/70"
            >
              Jump to Recent Sessions
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
              Completion Time
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-[color:var(--muted-foreground)]">Median completion</p>
                <p className="mt-2 text-2xl font-semibold">
                  {formatSessionDuration(healthSnapshot.medianCompletionMs)}
                </p>
              </div>
              <div>
                <p className="text-sm text-[color:var(--muted-foreground)]">Average completion</p>
                <p className="mt-2 text-2xl font-semibold">
                  {formatSessionDuration(healthSnapshot.averageCompletionMs)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
              Calculated from {healthSnapshot.completedCount} completed sessions in the current window.
            </p>

            {healthSnapshot.slowestSession ? (
              <div className="mt-4 rounded-[1.25rem] border border-[color:var(--border)] bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                  Slowest recent result
                </p>
                <Link
                  href={`/sessions/${healthSnapshot.slowestSession.id}`}
                  className="mt-2 inline-flex break-all font-mono text-sm font-semibold underline decoration-[color:var(--border)] underline-offset-4"
                >
                  {healthSnapshot.slowestSession.id}
                </Link>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                  {healthSnapshot.slowestSession.candidateLabel || "Unnamed session"} ·{" "}
                  {formatSessionDuration(healthSnapshot.slowestSession.durationMs)} ·{" "}
                  {sessionStatusLabel(healthSnapshot.slowestSession.status)}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
                There are no completed sessions inside the current window yet.
              </p>
            )}
          </section>

          <section className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              Needs Review
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-white/80 p-4">
                <p className="text-sm text-[color:var(--muted-foreground)]">In flight</p>
                <p className="mt-2 text-2xl font-semibold">{healthSnapshot.inFlightCount}</p>
              </div>
              <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-white/80 p-4">
                <p className="text-sm text-[color:var(--muted-foreground)]">Needs review</p>
                <p className="mt-2 text-2xl font-semibold">
                  {healthSnapshot.problemSessions.length}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
              {healthSnapshot.inFlightCount > 0
                ? `${healthSnapshot.inFlightCount} sessions are still queued, parsing, or analyzing, so they are excluded from the terminal-state totals above.`
                : "Every session in the current window has reached a terminal state."}
            </p>
            <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
              If parser failures or clarification-needed results start increasing, the attention queue below is usually the best place to look first.
            </p>
            <a
              href="#attention-queue"
              className="mt-4 inline-flex rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-white/70"
            >
              Jump to Attention Queue
            </a>
          </section>
        </div>
      </section>

      <section id="attention-queue" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              Attention Queue
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Recent results that need recovery or review
            </h2>
          </div>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Showing up to {healthSnapshot.problemSessions.length} sessions.
          </p>
        </div>

        {healthSnapshot.problemSessions.length === 0 ? (
          <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
            <h3 className="text-lg font-semibold">Nothing needs immediate review</h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
              There are no parser failures, hard failures, or clarification-needed sessions in the current window.
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
                      {entry.session.candidateLabel || "Review-required session"}
                    </p>
                    <Link
                      href={`/sessions/${entry.session.id}`}
                      className="mt-2 inline-flex break-all font-mono text-base font-semibold underline decoration-[color:var(--border)] underline-offset-4"
                    >
                      {entry.session.id}
                    </Link>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      Created {formatSessionDate(entry.session.createdAt)} · Completed{" "}
                      {formatSessionDate(sessionEndedAt(entry.session))}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm">
                    {entry.recoveryAttemptCount > 0 ? (
                      <span className="rounded-full border border-[color:var(--border)] bg-white/80 px-4 py-2 font-semibold">
                        Retries {entry.recoveryAttemptCount}
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
                      Input source
                    </p>
                    <p className="mt-2 text-sm">{sessionSourceLabel(entry.session.sourceType)}</p>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      Updated {formatSessionDate(entry.session.updatedAt)}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                      Latest issue code
                    </p>
                    <p className="mt-2 break-all font-mono text-sm font-semibold">
                      {problemCode(entry)}
                    </p>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      Retries in window: {entry.recoveryAttemptCount}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                      Processing time
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {formatSessionDuration(entry.completionDurationMs)}
                    </p>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      Time from creation to terminal state.
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
                      Previous session {entry.retriedFromSession.id}
                    </Link>
                  ) : (
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      Open the detail view to inspect evidence, retries, and feedback state.
                    </p>
                  )}

                  <Link
                    href={`/sessions/${entry.session.id}`}
                    className="inline-flex rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-white/70"
                  >
                    Open Details
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
              Recent Sessions
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Start with the latest results</h2>
          </div>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Showing up to {recentSessions.length} sessions
          </p>
        </div>

        {recentSessions.length === 0 ? (
          <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
            <h3 className="text-lg font-semibold">No results yet</h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
              Start from the homepage with pasted text or a file upload and the newest sessions will appear here.
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
                      {entry.session.candidateLabel || "Unnamed session"}
                    </p>
                      <h3 className="mt-2 break-all font-mono text-base font-semibold md:text-lg">
                        {entry.session.id}
                      </h3>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      Created {formatSessionDate(entry.session.createdAt)} · Updated{" "}
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
                        Input source
                      </p>
                      <p className="mt-2 text-sm">{sessionSourceLabel(entry.session.sourceType)}</p>
                      <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                        Completed {formatSessionDate(sessionEndedAt(entry.session))}
                      </p>
                    </div>

                    <div
                      className={`grid gap-4 ${entry.retriedFromSession ? "md:grid-cols-3" : "md:grid-cols-2"}`}
                    >
                      <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                          Result note
                        </p>
                        <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                          {sessionNote(entry)}
                        </p>
                      </div>

                      <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                          Feedback
                        </p>
                        <p className="mt-2 text-sm font-semibold">{feedback.label}</p>
                        <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                          {feedback.detail}
                        </p>
                      </div>

                      {entry.retriedFromSession ? (
                        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                            Linked from previous session
                          </p>
                          <Link
                            href={`/sessions/${entry.retriedFromSession.id}`}
                            className="mt-2 inline-flex font-mono text-sm font-semibold underline decoration-[color:var(--border)] underline-offset-4"
                          >
                            {entry.retriedFromSession.id}
                          </Link>
                          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                            Previous status {sessionStatusLabel(entry.retriedFromSession.status)}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <Link
                      href={`/sessions/${entry.session.id}`}
                      className="inline-flex rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-white/70"
                    >
                      Open Details
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
