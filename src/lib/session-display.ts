import type { SessionSnapshot } from "@/lib/session-snapshot";

type SessionStatus = SessionSnapshot["session"]["status"];
type FeedbackSentiment = NonNullable<SessionSnapshot["feedbackEvent"]>["sentiment"];
type SessionSourceType = SessionSnapshot["session"]["sourceType"];

export function formatSessionDate(value: Date | string | null) {
  if (!value) {
    return "Not finished yet";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatSessionDuration(value: number | null) {
  if (value === null) {
    return "Not finished yet";
  }

  const totalSeconds = Math.max(0, Math.round(value / 1000));

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  if (totalMinutes < 60) {
    return remainingSeconds === 0
      ? `${totalMinutes}m`
      : `${totalMinutes}m ${remainingSeconds}s`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return remainingMinutes === 0
    ? `${totalHours}h`
    : `${totalHours}h ${remainingMinutes}m`;
}

export function sessionStatusLabel(status: SessionStatus) {
  switch (status) {
    case "queued":
      return "Queued";
    case "parsing":
      return "Parsing";
    case "analyzing":
      return "Analyzing";
    case "ready":
      return "Ready";
    case "insufficient_evidence":
      return "Insufficient evidence";
    case "parser_failure":
      return "Parser failure";
    case "failed":
      return "Failed";
  }
}

export function feedbackSentimentLabel(sentiment: FeedbackSentiment) {
  switch (sentiment) {
    case "helpful":
      return "Helpful";
    case "not_helpful":
      return "Not helpful";
  }
}

export function sessionSourceLabel(sourceType: SessionSourceType) {
  switch (sourceType) {
    case "pasted_text":
      return "Pasted text";
    case "file_upload":
      return "File upload";
  }
}
