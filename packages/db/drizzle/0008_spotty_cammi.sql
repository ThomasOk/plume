CREATE TYPE "public"."space_role" AS ENUM('admin', 'member');--> statement-breakpoint
ALTER TYPE "public"."visibility" ADD VALUE 'space';--> statement-breakpoint
CREATE TABLE "space" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "space_member" (
	"space_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "space_role" NOT NULL,
	"joined_at" timestamp NOT NULL,
	CONSTRAINT "space_member_space_id_user_id_pk" PRIMARY KEY("space_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "memo" ADD COLUMN "space_id" text;--> statement-breakpoint
ALTER TABLE "space_member" ADD CONSTRAINT "space_member_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_member" ADD CONSTRAINT "space_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "space_member_user_id_idx" ON "space_member" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "memo" ADD CONSTRAINT "memo_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memo_space_id_created_at_idx" ON "memo" USING btree ("space_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "memo" ADD CONSTRAINT "memo_space_visibility_equivalence" CHECK (("memo"."space_id" IS NOT NULL) = ("memo"."visibility"::text = 'space'));