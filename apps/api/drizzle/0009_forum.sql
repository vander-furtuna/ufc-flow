CREATE TYPE "public"."message_status" AS ENUM('VISIBLE', 'HIDDEN', 'REMOVED');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'FORUM_REPLY';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'FORUM_THREAD_REPLY';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'FORUM_LIKES';--> statement-breakpoint
CREATE TABLE "message_likes" (
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "message_likes_message_id_user_id_pk" PRIMARY KEY("message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "message_subject_mentions" (
	"message_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	CONSTRAINT "message_subject_mentions_message_id_subject_id_pk" PRIMARY KEY("message_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"course_id" uuid NOT NULL,
	"author_id" uuid,
	"parent_id" uuid,
	"root_id" uuid,
	"content" text NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"status" "message_status" DEFAULT 'VISIBLE' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"edited_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"removed_by" uuid,
	"removal_reason" text,
	CONSTRAINT "messages_content_length" CHECK (char_length("messages"."content") <= 500),
	CONSTRAINT "messages_thread" CHECK (("messages"."parent_id" IS NULL) = ("messages"."root_id" IS NULL)),
	CONSTRAINT "messages_counts" CHECK ("messages"."reply_count" >= 0 AND "messages"."like_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "message_likes" ADD CONSTRAINT "message_likes_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_likes" ADD CONSTRAINT "message_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_subject_mentions" ADD CONSTRAINT "message_subject_mentions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_subject_mentions" ADD CONSTRAINT "message_subject_mentions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_parent_id_messages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_root_id_messages_id_fk" FOREIGN KEY ("root_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_removed_by_users_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_subject_mentions_subject" ON "message_subject_mentions" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "messages_timeline" ON "messages" USING btree ("course_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "messages"."parent_id" IS NULL;--> statement-breakpoint
CREATE INDEX "messages_replies" ON "messages" USING btree ("parent_id","created_at","id");--> statement-breakpoint
CREATE INDEX "messages_root" ON "messages" USING btree ("root_id");--> statement-breakpoint
CREATE INDEX "messages_author_created" ON "messages" USING btree ("author_id","created_at");