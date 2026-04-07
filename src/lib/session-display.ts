import type { SessionSnapshot } from "@/lib/session-snapshot";

type SessionStatus = SessionSnapshot["session"]["status"];
type FeedbackSentiment = NonNullable<SessionSnapshot["feedbackEvent"]>["sentiment"];
type SessionSourceType = SessionSnapshot["session"]["sourceType"];

export function formatSessionDate(value: Date | string | null) {
  if (!value) {
    return "아직 완료되지 않았습니다";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatSessionDuration(value: number | null) {
  if (value === null) {
    return "아직 완료되지 않았습니다";
  }

  const totalSeconds = Math.max(0, Math.round(value / 1000));

  if (totalSeconds < 60) {
    return `${totalSeconds}초`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  if (totalMinutes < 60) {
    return remainingSeconds === 0
      ? `${totalMinutes}분`
      : `${totalMinutes}분 ${remainingSeconds}초`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return remainingMinutes === 0
    ? `${totalHours}시간`
    : `${totalHours}시간 ${remainingMinutes}분`;
}

export function sessionStatusLabel(status: SessionStatus) {
  switch (status) {
    case "queued":
      return "대기 중";
    case "parsing":
      return "읽는 중";
    case "analyzing":
      return "분석 중";
    case "ready":
      return "결과 준비 완료";
    case "insufficient_evidence":
      return "정보 보완 필요";
    case "parser_failure":
      return "파일 읽기 실패";
    case "failed":
      return "처리 실패";
  }
}

export function feedbackSentimentLabel(sentiment: FeedbackSentiment) {
  switch (sentiment) {
    case "helpful":
      return "도움 되었음";
    case "not_helpful":
      return "도움이 부족했음";
  }
}

export function sessionSourceLabel(sourceType: SessionSourceType) {
  switch (sourceType) {
    case "pasted_text":
      return "텍스트 붙여넣기";
    case "file_upload":
      return "파일 업로드";
  }
}
