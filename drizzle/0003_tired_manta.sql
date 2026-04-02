CREATE TYPE "public"."feedback_sentiment" AS ENUM('helpful', 'not_helpful');--> statement-breakpoint
CREATE TABLE "feedback_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_session_id" uuid NOT NULL,
	"sentiment" "feedback_sentiment" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_events_analysis_session_id_unique" UNIQUE("analysis_session_id")
);
--> statement-breakpoint
ALTER TABLE "feedback_events" ADD CONSTRAINT "feedback_events_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE cascade ON UPDATE no action;