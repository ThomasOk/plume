CREATE TYPE "public"."notification_status" AS ENUM('UNREAD', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('MEMO_COMMENT');--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"sender_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"entity_id" text NOT NULL,
	"status" "notification_status" DEFAULT 'UNREAD' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_receiver_id_user_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_entity_id_memo_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."memo"("id") ON DELETE cascade ON UPDATE no action;