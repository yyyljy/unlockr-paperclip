CREATE TABLE "candidate_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_session_id" uuid NOT NULL,
	"profile_version" text NOT NULL,
	"headline" text,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_profiles_analysis_session_id_unique" UNIQUE("analysis_session_id")
);
--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE cascade ON UPDATE no action;