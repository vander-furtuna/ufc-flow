CREATE TYPE "public"."moderation_action" AS ENUM('HIDE_MESSAGE', 'REMOVE_MESSAGE', 'RESTORE_MESSAGE', 'MUTE_USER', 'BAN_USER', 'LIFT_RESTRICTION');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('SPAM', 'OFFENSIVE', 'HARASSMENT', 'PERSONAL_DATA', 'OFF_TOPIC', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('OPEN', 'ACCEPTED', 'DISMISSED');--> statement-breakpoint
CREATE TYPE "public"."restriction_type" AS ENUM('MUTE', 'BAN');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'MESSAGE_MODERATED';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'USER_RESTRICTED';--> statement-breakpoint
CREATE TABLE "message_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"message_id" uuid NOT NULL,
	"reporter_id" uuid,
	"reason" "report_reason" NOT NULL,
	"details" text,
	"content_snapshot" text NOT NULL,
	"status" "report_status" DEFAULT 'OPEN' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"course_id" uuid NOT NULL,
	"moderator_id" uuid,
	"action" "moderation_action" NOT NULL,
	"target_message_id" uuid,
	"target_user_id" uuid,
	"report_id" uuid,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_course_restrictions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"type" "restriction_type" NOT NULL,
	"reason" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"lifted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_target_message_id_messages_id_fk" FOREIGN KEY ("target_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_report_id_message_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."message_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_course_restrictions" ADD CONSTRAINT "user_course_restrictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_course_restrictions" ADD CONSTRAINT "user_course_restrictions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_course_restrictions" ADD CONSTRAINT "user_course_restrictions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "message_reports_one_per_person" ON "message_reports" USING btree ("message_id","reporter_id");--> statement-breakpoint
CREATE INDEX "message_reports_open" ON "message_reports" USING btree ("message_id") WHERE "message_reports"."status" = 'OPEN';--> statement-breakpoint
CREATE INDEX "moderation_actions_course" ON "moderation_actions" USING btree ("course_id","created_at");--> statement-breakpoint
CREATE INDEX "moderation_actions_message" ON "moderation_actions" USING btree ("target_message_id");--> statement-breakpoint
CREATE INDEX "user_course_restrictions_active" ON "user_course_restrictions" USING btree ("user_id","course_id") WHERE "user_course_restrictions"."lifted_at" IS NULL;