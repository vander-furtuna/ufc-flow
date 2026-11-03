CREATE TYPE "public"."post_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('NEWS', 'EVENT', 'SCHOLARSHIP', 'EXTENSION_PROJECT', 'CALL');--> statement-breakpoint
CREATE TABLE "hub_reads" (
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	CONSTRAINT "hub_reads_user_id_course_id_pk" PRIMARY KEY("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "post_images" (
	"post_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "post_images_post_id_file_id_pk" PRIMARY KEY("post_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"course_id" uuid,
	"author_id" uuid,
	"type" "post_type" NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text,
	"body_md" text NOT NULL,
	"cover_file_id" uuid,
	"external_url" text,
	"status" "post_status" NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"deadline_at" timestamp with time zone,
	"location" text,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"search_text" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "posts_ends_after_start" CHECK ("posts"."ends_at" IS NULL OR "posts"."starts_at" IS NULL OR "posts"."ends_at" >= "posts"."starts_at")
);
--> statement-breakpoint
ALTER TABLE "hub_reads" ADD CONSTRAINT "hub_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hub_reads" ADD CONSTRAINT "hub_reads_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_images" ADD CONSTRAINT "post_images_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_images" ADD CONSTRAINT "post_images_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_file_id_files_id_fk" FOREIGN KEY ("cover_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "posts_course_slug" ON "posts" USING btree ("course_id","slug") WHERE "posts"."course_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "posts_institutional_slug" ON "posts" USING btree ("slug") WHERE "posts"."course_id" IS NULL;--> statement-breakpoint
CREATE INDEX "posts_feed" ON "posts" USING btree ("course_id","status",coalesce("published_at", "created_at") DESC);--> statement-breakpoint
CREATE INDEX "posts_search_text_trgm" ON "posts" USING gin ("search_text" gin_trgm_ops);