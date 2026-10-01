CREATE TABLE "space_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "space_role" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"invited_by_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "space_invitation_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "space_invitation_space_id_email_unique" UNIQUE("space_id","email")
);
--> statement-breakpoint
ALTER TABLE "space_invitation" ADD CONSTRAINT "space_invitation_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_invitation" ADD CONSTRAINT "space_invitation_invited_by_id_user_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;