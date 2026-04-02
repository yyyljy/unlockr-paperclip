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
      label: "Feedback missing",
      detail: "Terminal session is eligible for saved operator feedback, but none has been captured yet.",
    };
  }

  return {
    label: "Not eligible",
    detail: "Feedback only appears after ready, insufficient-evidence, or parser-failure outcomes.",
  };
}

function sessionNote(entry: {
  session: RecentSessionEntry["session"];
  retriedFromSession: RecentSessionEntry["retriedFromSession"];
}) {
  if (entry.retriedFromSession) {
    if (entry.retriedFromSession.status === "parser_failure") {
      return `Recovery attempt from ${entry.retriedFromSession.id}. Unlockr preserved the failed session and started a fresh run from a replacement file or cleaned pasted text.`;
    }

    return `Recovery attempt from ${entry.retriedFromSession.id}. Unlockr reused the earlier source text and appended new clarification before rerunning analysis.`;
  }

  if (entry.session.latestErrorCode) {
    return `${entry.session.latestErrorCode}: ${
      entry.session.latestErrorMessage ?? "No error message captured."
    }`;
  }

  switch (entry.session.status) {
    case "ready":
      return "Recommendations, candidate profile, and evidence are ready on the detail page.";
    case "insufficient_evidence":
      return "Open the detail page to review blocking findings and follow-up questions.";
    case "parser_failure":
      return "Open the detail page to inspect parser output and recovery guidance.";
    case "failed":
      return "Open the detail page to inspect the captured failure metadata before retrying.";
    default:
      return "This session is still moving through intake, parsing, or recommendation work.";
  }
}

function recoveryBadgeLabel(entry: RecentSessionEntry) {
  if (!entry.retriedFromSession) {
    return null;
  }

  return entry.retriedFromSession.status === "parser_failure"
    ? "Parser recovery"
    : "Clarification recovery";
}

function outcomeSummaryCopy(status: OutcomeStatus) {
  switch (status) {
    case "ready":
      return "Sessions reached a recommendation-ready terminal state.";
    case "insufficient_evidence":
      return "Operators still need clarification before trusting the next run.";
    case "parser_failure":
      return "Resume extraction failed and needs replacement input or parser follow-up.";
    case "failed":
      return "A non-parser failure blocked trustworthy output.";
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
      return "operator_review";
  }
}

function problemDetail(entry: ProblemSessionEntry) {
  const message = entry.session.latestErrorMessage?.trim();

  if (message) {
    return message;
  }

  if (entry.recoveryAttemptCount > 0) {
    return `${sessionNote(entry)} ${entry.recoveryAttemptCount} linked recovery ${
      entry.recoveryAttemptCount === 1 ? "attempt is" : "attempts are"
    } already visible in the recent window.`;
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
            Operator review
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            Recent analysis sessions without raw ids.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--muted-foreground)] md:text-base">
            Review the latest session outcomes, scan the recent health snapshot, and
            confirm whether operator feedback was saved before drilling into
            recommendation evidence on the detail page.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/"
              className="rounded-full bg-[color:var(--accent)] px-5 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Start another session
            </Link>
            <a
              href="/api/health"
              className="rounded-full border border-[color:var(--border)] px-5 py-3 transition hover:bg-white/70"
            >
              Check health
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-[2rem] border border-[color:var(--border)] bg-white/80 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              Snapshot flow
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
              <li>Start with the health snapshot to see recent ready, recovery, and failure pressure.</li>
              <li>Use the attention queue to jump straight into sessions that need operator review.</li>
              <li>Use the feedback badge to confirm whether a saved operator verdict already exists.</li>
            </ul>
          </section>

          <section className="rounded-[2rem] border border-[color:var(--border)] bg-white/80 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              Current limits
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
              <li>Only the 25 most recently updated sessions are sampled for the snapshot and list.</li>
              <li>No auth, search, filters, or bulk actions are included yet.</li>
              <li>Feedback is latest-state only, so resubmissions replace the prior note and sentiment.</li>
            </ul>
          </section>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--border)] bg-white/85 p-6 shadow-[0_10px_30px_rgba(18,19,20,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              Operator health snapshot
            </p>
            <h2 className="mt-2 text-2xl font-semibold md:text-3xl">
              Recent outcomes and latency at a glance
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--muted-foreground)]">
              These counts cover the same recent window shown in the review list, so operators
              can see trust-risking outcomes before opening a raw session id.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              Current window
            </p>
            <p className="mt-2 text-3xl font-semibold">{healthSnapshot.windowSize}</p>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              recently updated sessions sampled
            </p>
            <a
              href="#recent-sessions"
              className="mt-4 inline-flex rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-white/70"
            >
              Jump to review list
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
              Latency read
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
              {healthSnapshot.completedCount} completed sessions contribute to this recent
              latency read.
            </p>

            {healthSnapshot.slowestSession ? (
              <div className="mt-4 rounded-[1.25rem] border border-[color:var(--border)] bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                  Slowest recent completion
                </p>
                <Link
                  href={`/sessions/${healthSnapshot.slowestSession.id}`}
                  className="mt-2 inline-flex break-all font-mono text-sm font-semibold underline decoration-[color:var(--border)] underline-offset-4"
                >
                  {healthSnapshot.slowestSession.id}
                </Link>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                  {healthSnapshot.slowestSession.candidateLabel || "Unlabeled candidate"} ·{" "}
                  {formatSessionDuration(healthSnapshot.slowestSession.durationMs)} ·{" "}
                  {sessionStatusLabel(healthSnapshot.slowestSession.status)}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
                No completed sessions have landed in the current window yet.
              </p>
            )}
          </section>

          <section className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              Review pressure
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-white/80 p-4">
                <p className="text-sm text-[color:var(--muted-foreground)]">In flight</p>
                <p className="mt-2 text-2xl font-semibold">{healthSnapshot.inFlightCount}</p>
              </div>
              <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-white/80 p-4">
                <p className="text-sm text-[color:var(--muted-foreground)]">Attention sessions</p>
                <p className="mt-2 text-2xl font-semibold">
                  {healthSnapshot.problemSessions.length}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
              {healthSnapshot.inFlightCount > 0
                ? `${healthSnapshot.inFlightCount} sessions are still queued, parsing, or analyzing and are excluded from the terminal outcome counts above.`
                : "All sampled sessions have already reached a terminal outcome."}
            </p>
            <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
              Use the attention queue first when parser failures, hard failures, or
              clarification-heavy sessions start clustering.
            </p>
            <a
              href="#attention-queue"
              className="mt-4 inline-flex rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-white/70"
            >
              Open attention queue
            </a>
          </section>
        </div>
      </section>

      <section id="attention-queue" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              Attention queue
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Recent failures and recovery-heavy sessions
            </h2>
          </div>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Showing up to {healthSnapshot.problemSessions.length} recent sessions that need
            extra operator attention.
          </p>
        </div>

        {healthSnapshot.problemSessions.length === 0 ? (
          <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
            <h3 className="text-lg font-semibold">No recent attention sessions</h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
              The current review window has no parser failures, hard failures, or
              clarification-required sessions.
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
                      {entry.session.candidateLabel || "Needs operator attention"}
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
                        Recoveries {entry.recoveryAttemptCount}
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
                      Intake
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
                      Recovery attempts in window {entry.recoveryAttemptCount}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                      Timing
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {formatSessionDuration(entry.completionDurationMs)}
                    </p>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      Created-to-terminal timing using stored session timestamps.
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
                      Source session {entry.retriedFromSession.id}
                    </Link>
                  ) : (
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      Open the detail page for evidence, retry options, and feedback state.
                    </p>
                  )}

                  <Link
                    href={`/sessions/${entry.session.id}`}
                    className="inline-flex rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-white/70"
                  >
                    Open detail
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
              Recent sessions
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Newest activity first</h2>
          </div>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Showing up to {recentSessions.length} sessions.
          </p>
        </div>

        {recentSessions.length === 0 ? (
          <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
            <h3 className="text-lg font-semibold">No sessions yet</h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
              Run a pasted-text or file-upload intake from the home page, then return here to
              review the newest session outcomes.
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
                        {entry.session.candidateLabel || "Unlabeled candidate"}
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
                        Intake
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
                          Session note
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
                            Recovered from
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
                      Open detail
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
