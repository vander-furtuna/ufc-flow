CREATE TYPE "public"."notification_type" AS ENUM('MODERATOR_REQUEST_CREATED', 'MODERATOR_REQUEST_REVIEWED', 'SCHEDULE_SECTION_CHANGED', 'SCHEDULE_SECTION_REMOVED', 'SCRAPE_FAILED', 'IMPORT_PENDING');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"actor_id" uuid,
	"course_id" uuid,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"group_key" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_updated" ON "notifications" USING btree ("user_id","updated_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_unread" ON "notifications" USING btree ("user_id") WHERE "notifications"."read_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_unread_group" ON "notifications" USING btree ("user_id","group_key") WHERE "notifications"."read_at" IS NULL;