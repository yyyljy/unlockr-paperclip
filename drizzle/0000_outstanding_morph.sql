CREATE TYPE "public"."analysis_run_stage" AS ENUM('parse', 'recommend');--> statement-breakpoint
CREATE TYPE "public"."analysis_run_status" AS ENUM('queued', 'processing', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."analysis_session_status" AS ENUM('queued', 'parsing', 'analyzing', 'ready', 'insufficient_evidence', 'parser_failure', 'failed');--> statement-breakpoint
CREATE TYPE "public"."analysis_source_type" AS ENUM('file_upload', 'pasted_text');--> statement-breakpoint
CREATE TYPE "public"."confidence_label" AS ENUM('high', 'medium', 'low', 'insufficient');--> statement-breakpoint
CREATE TYPE "public"."recommendation_state" AS ENUM('ready', 'insufficient_evidence', 'parser_failure');--> statement-breakpoint
CREATE TABLE "analysis_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_session_id" uuid NOT NULL,
	"stage" "analysis_run_stage" NOT NULL,
	"status" "analysis_run_status" DEFAULT 'queued' NOT NULL,
	"queue_job_id" text,
	"parser_version" text,
	"model_provider" text,
	"model_version" text,
	"prompt_version" text,
	"raw_output" jsonb,
	"error_code" text,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" "analysis_source_type" NOT NULL,
	"status" "analysis_session_status" DEFAULT 'queued' NOT NULL,
	"candidate_label" text,
	"contract_version" text,
	"parser_version" text,
	"model_version" text,
	"prompt_version" text,
	"taxonomy_version" text,
	"latest_error_code" text,
	"latest_error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "career_recommendation_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_session_id" uuid NOT NULL,
	"status" "recommendation_state" NOT NULL,
	"summary_headline" text,
	"payload" jsonb NOT NULL,
	"contract_version" text NOT NULL,
	"parser_version" text NOT NULL,
	"model_provider" text,
	"model_version" text,
	"prompt_version" text,
	"taxonomy_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_set_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"role_family" text NOT NULL,
	"role_title" text NOT NULL,
	"target_domains" jsonb NOT NULL,
	"confidence_label" "confidence_label" NOT NULL,
	"confidence_score" double precision NOT NULL,
	"detected_experience" jsonb NOT NULL,
	"inferred_potential" jsonb NOT NULL,
	"rationale" text NOT NULL,
	"next_steps" jsonb NOT NULL,
	"gaps" jsonb NOT NULL,
	"risks" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"source_kind" text NOT NULL,
	"section_label" text NOT NULL,
	"snippet" text NOT NULL,
	"reason" text NOT NULL,
	"start_offset" integer,
	"end_offset" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_text_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_session_id" uuid NOT NULL,
	"raw_text" text NOT NULL,
	"source_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_session_id" uuid NOT NULL,
	"original_filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_recommendation_sets" ADD CONSTRAINT "career_recommendation_sets_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_recommendations" ADD CONSTRAINT "career_recommendations_recommendation_set_id_career_recommendation_sets_id_fk" FOREIGN KEY ("recommendation_set_id") REFERENCES "public"."career_recommendation_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_evidence" ADD CONSTRAINT "recommendation_evidence_recommendation_id_career_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."career_recommendations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_text_sources" ADD CONSTRAINT "resume_text_sources_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_uploads" ADD CONSTRAINT "resume_uploads_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE cascade ON UPDATE no action;