import {
  type AnyPgColumn,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import type { CandidateProfile } from "@/lib/candidate-profile";

type ParsedDocumentSectionRecord = {
  label: string;
  heading: string | null;
  content: string;
  confidence: "high" | "medium" | "low";
  startOffset: number | null;
  endOffset: number | null;
};

export const analysisSourceTypeEnum = pgEnum("analysis_source_type", [
  "file_upload",
  "pasted_text",
]);

export const analysisSessionStatusEnum = pgEnum("analysis_session_status", [
  "queued",
  "parsing",
  "analyzing",
  "ready",
  "insufficient_evidence",
  "parser_failure",
  "failed",
]);

export const analysisRunStageEnum = pgEnum("analysis_run_stage", [
  "parse",
  "recommend",
]);

export const analysisRunStatusEnum = pgEnum("analysis_run_status", [
  "queued",
  "processing",
  "succeeded",
  "failed",
]);

export const recommendationStateEnum = pgEnum("recommendation_state", [
  "ready",
  "insufficient_evidence",
  "parser_failure",
]);

export const confidenceLabelEnum = pgEnum("confidence_label", [
  "high",
  "medium",
  "low",
  "insufficient",
]);

export const feedbackSentimentEnum = pgEnum("feedback_sentiment", [
  "helpful",
  "not_helpful",
]);

export const analysisSessions = pgTable("analysis_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceType: analysisSourceTypeEnum("source_type").notNull(),
  retriedFromAnalysisSessionId: uuid("retried_from_analysis_session_id").references(
    (): AnyPgColumn => analysisSessions.id,
    { onDelete: "set null" },
  ),
  status: analysisSessionStatusEnum("status").default("queued").notNull(),
  candidateLabel: text("candidate_label"),
  contractVersion: text("contract_version"),
  parserVersion: text("parser_version"),
  modelVersion: text("model_version"),
  promptVersion: text("prompt_version"),
  taxonomyVersion: text("taxonomy_version"),
  latestErrorCode: text("latest_error_code"),
  latestErrorMessage: text("latest_error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const resumeUploads = pgTable("resume_uploads", {
  id: uuid("id").defaultRandom().primaryKey(),
  analysisSessionId: uuid("analysis_session_id")
    .references(() => analysisSessions.id, { onDelete: "cascade" })
    .notNull(),
  originalFilename: text("original_filename").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storageKey: text("storage_key").notNull(),
  sha256: text("sha256").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const resumeTextSources = pgTable("resume_text_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  analysisSessionId: uuid("analysis_session_id")
    .references(() => analysisSessions.id, { onDelete: "cascade" })
    .notNull(),
  rawText: text("raw_text").notNull(),
  sourceLabel: text("source_label"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const parsedDocuments = pgTable("parsed_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  analysisSessionId: uuid("analysis_session_id")
    .references(() => analysisSessions.id, { onDelete: "cascade" })
    .notNull(),
  parserProvider: text("parser_provider").notNull(),
  parserVersion: text("parser_version").notNull(),
  parserMode: text("parser_mode").notNull(),
  rawText: text("raw_text").notNull(),
  normalizedText: text("normalized_text").notNull(),
  sections: jsonb("sections").$type<ParsedDocumentSectionRecord[]>().notNull(),
  qualityScore: doublePrecision("quality_score").notNull(),
  qualityFlags: jsonb("quality_flags").$type<string[]>().notNull(),
  parserWarnings: jsonb("parser_warnings").$type<string[]>().notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const candidateProfiles = pgTable("candidate_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  analysisSessionId: uuid("analysis_session_id")
    .references(() => analysisSessions.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  profileVersion: text("profile_version").notNull(),
  headline: text("headline"),
  payload: jsonb("payload").$type<CandidateProfile>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const analysisRuns = pgTable("analysis_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  analysisSessionId: uuid("analysis_session_id")
    .references(() => analysisSessions.id, { onDelete: "cascade" })
    .notNull(),
  stage: analysisRunStageEnum("stage").notNull(),
  status: analysisRunStatusEnum("status").default("queued").notNull(),
  queueJobId: text("queue_job_id"),
  parserVersion: text("parser_version"),
  modelProvider: text("model_provider"),
  modelVersion: text("model_version"),
  promptVersion: text("prompt_version"),
  rawOutput: jsonb("raw_output").$type<Record<string, unknown>>(),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const feedbackEvents = pgTable("feedback_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  analysisSessionId: uuid("analysis_session_id")
    .references(() => analysisSessions.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  sentiment: feedbackSentimentEnum("sentiment").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const careerRecommendationSets = pgTable("career_recommendation_sets", {
  id: uuid("id").defaultRandom().primaryKey(),
  analysisSessionId: uuid("analysis_session_id")
    .references(() => analysisSessions.id, { onDelete: "cascade" })
    .notNull(),
  status: recommendationStateEnum("status").notNull(),
  summaryHeadline: text("summary_headline"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  contractVersion: text("contract_version").notNull(),
  parserVersion: text("parser_version").notNull(),
  modelProvider: text("model_provider"),
  modelVersion: text("model_version"),
  promptVersion: text("prompt_version"),
  taxonomyVersion: text("taxonomy_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const careerRecommendations = pgTable("career_recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  recommendationSetId: uuid("recommendation_set_id")
    .references(() => careerRecommendationSets.id, { onDelete: "cascade" })
    .notNull(),
  rank: integer("rank").notNull(),
  roleFamily: text("role_family").notNull(),
  roleTitle: text("role_title").notNull(),
  targetDomains: jsonb("target_domains").$type<string[]>().notNull(),
  confidenceLabel: confidenceLabelEnum("confidence_label").notNull(),
  confidenceScore: doublePrecision("confidence_score").notNull(),
  detectedExperience: jsonb("detected_experience").$type<string[]>().notNull(),
  inferredPotential: jsonb("inferred_potential").$type<string[]>().notNull(),
  rationale: text("rationale").notNull(),
  nextSteps: jsonb("next_steps").$type<Record<string, unknown>[]>().notNull(),
  gaps: jsonb("gaps").$type<Record<string, unknown>[]>().notNull(),
  risks: jsonb("risks").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const recommendationEvidence = pgTable("recommendation_evidence", {
  id: uuid("id").defaultRandom().primaryKey(),
  recommendationId: uuid("recommendation_id")
    .references(() => careerRecommendations.id, { onDelete: "cascade" })
    .notNull(),
  sourceKind: text("source_kind").notNull(),
  sectionLabel: text("section_label").notNull(),
  snippet: text("snippet").notNull(),
  reason: text("reason").notNull(),
  startOffset: integer("start_offset"),
  endOffset: integer("end_offset"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
