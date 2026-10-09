CREATE TABLE "reaction" (
	"id" text PRIMARY KEY NOT NULL,
	"memo_id" text NOT NULL,
	"user_id" text NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "reaction_user_id_memo_id_unique" UNIQUE("user_id","memo_id")
);
--> statement-breakpoint
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_memo_id_memo_id_fk" FOREIGN KEY ("memo_id") REFERENCES "public"."memo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reaction_memo_id_idx" ON "reaction" USING btree ("memo_id");