CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'processed', 'failed');--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp NOT NULL,
	"last_error" text,
	"created_at" timestamp NOT NULL,
	"processed_at" timestamp
);
