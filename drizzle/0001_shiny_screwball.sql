CREATE TABLE "parsed_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_session_id" uuid NOT NULL,
	"parser_provider" text NOT NULL,
	"parser_version" text NOT NULL,
	"parser_mode" text NOT NULL,
	"raw_text" text NOT NULL,
	"normalized_text" text NOT NULL,
	"sections" jsonb NOT NULL,
	"quality_score" double precision NOT NULL,
	"quality_flags" jsonb NOT NULL,
	"parser_warnings" jsonb NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parsed_documents" ADD CONSTRAINT "parsed_documents_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE cascade ON UPDATE no action;