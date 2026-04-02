import type { CandidateProfile } from "@/lib/candidate-profile";
import type { AnalysisResult } from "@/lib/contracts/recommendations";

export type SessionSnapshot = {
  session: {
    id: string;
    sourceType: "file_upload" | "pasted_text";
    status:
      | "queued"
      | "parsing"
      | "analyzing"
      | "ready"
      | "insufficient_evidence"
      | "parser_failure"
      | "failed";
    candidateLabel: string | null;
    contractVersion: string | null;
    parserVersion: string | null;
    modelVersion: string | null;
    promptVersion: string | null;
    taxonomyVersion: string | null;
    latestErrorCode: string | null;
    latestErrorMessage: string | null;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
  };
  latestRun: {
    id: string;
    stage: "parse" | "recommend";
    status: "queued" | "processing" | "succeeded" | "failed";
    queueJobId: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: string;
  } | null;
  result: AnalysisResult | null;
  candidateProfile: CandidateProfile | null;
  feedbackEvent: {
    id: string;
    sentiment: "helpful" | "not_helpful";
    note: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  retriedFromSession: {
    id: string;
    sourceType: "file_upload" | "pasted_text";
    status:
      | "queued"
      | "parsing"
      | "analyzing"
      | "ready"
      | "insufficient_evidence"
      | "parser_failure"
      | "failed";
    candidateLabel: string | null;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
  } | null;
  recoverySessions: Array<{
    id: string;
    sourceType: "file_upload" | "pasted_text";
    status:
      | "queued"
      | "parsing"
      | "analyzing"
      | "ready"
      | "insufficient_evidence"
      | "parser_failure"
      | "failed";
    candidateLabel: string | null;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
  }>;
  recommendationSet: {
    id: string;
    status: "ready" | "insufficient_evidence" | "parser_failure";
    createdAt: string;
  } | null;
};

export const terminalSessionStatuses = new Set([
  "ready",
  "insufficient_evidence",
  "parser_failure",
  "failed",
]);

export const feedbackEligibleSessionStatuses = new Set([
  "ready",
  "insufficient_evidence",
  "parser_failure",
]);
