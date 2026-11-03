CREATE TYPE "public"."link_badge" AS ENUM('NONE', 'NEW');--> statement-breakpoint
CREATE TYPE "public"."link_button_shape" AS ENUM('SQUARE', 'ROUNDED', 'PILL');--> statement-breakpoint
CREATE TYPE "public"."link_button_style" AS ENUM('FILLED', 'OUTLINE', 'SOFT');--> statement-breakpoint
CREATE TYPE "public"."link_internal_target" AS ENUM('GRADE', 'AGENDA', 'HUB', 'CALENDARIO', 'RU');--> statement-breakpoint
CREATE TYPE "public"."link_kind" AS ENUM('URL', 'FILE', 'INTERNAL', 'POST');--> statement-breakpoint
CREATE TYPE "public"."link_page_theme" AS ENUM('CIANO', 'LARANJA', 'VERDE', 'VIOLETA', 'BRANCO', 'ESCURO');--> statement-breakpoint
CREATE TYPE "public"."link_title_font" AS ENUM('CLASH', 'GEIST');--> statement-breakpoint
CREATE TYPE "public"."link_traffic_source" AS ENUM('PAGE', 'QR', 'HUB');--> statement-breakpoint
CREATE TYPE "public"."social_network" AS ENUM('INSTAGRAM', 'EMAIL', 'WHATSAPP', 'YOUTUBE', 'SITE', 'OUTRO');--> statement-breakpoint
CREATE TABLE "course_link_pages" (
	"course_id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"bio" text,
	"avatar_file_id" uuid,
	"avatar_icon" text,
	"cover_file_id" uuid,
	"theme" "link_page_theme" NOT NULL,
	"button_style" "link_button_style" NOT NULL,
	"button_shape" "link_button_shape" NOT NULL,
	"title_font" "link_title_font" NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "course_link_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "course_link_sections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"course_id" uuid NOT NULL,
	"section_id" uuid,
	"kind" "link_kind" NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"url" text,
	"file_id" uuid,
	"internal_target" "link_internal_target",
	"post_id" uuid,
	"icon" text,
	"thumbnail_file_id" uuid,
	"is_featured" boolean DEFAULT false NOT NULL,
	"badge" "link_badge" DEFAULT 'NONE' NOT NULL,
	"open_in_same_tab" boolean DEFAULT false NOT NULL,
	"visible_from" timestamp with time zone,
	"visible_until" timestamp with time zone,
	"is_visible" boolean DEFAULT true NOT NULL,
	"position" integer NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "course_links_one_target" CHECK (("course_links"."kind" = 'URL') = ("course_links"."url" IS NOT NULL)
        AND ("course_links"."kind" = 'FILE') = ("course_links"."file_id" IS NOT NULL)
        AND ("course_links"."kind" = 'INTERNAL') = ("course_links"."internal_target" IS NOT NULL)
        AND ("course_links"."kind" = 'POST') = ("course_links"."post_id" IS NOT NULL)),
	CONSTRAINT "course_links_period" CHECK ("course_links"."visible_until" IS NULL OR "course_links"."visible_from" IS NULL OR "course_links"."visible_until" > "course_links"."visible_from")
);
--> statement-breakpoint
CREATE TABLE "course_social_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"course_id" uuid NOT NULL,
	"network" "social_network" NOT NULL,
	"url" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "link_clicks_daily" (
	"link_id" uuid NOT NULL,
	"day" date NOT NULL,
	"source" "link_traffic_source" NOT NULL,
	"clicks" integer NOT NULL,
	CONSTRAINT "link_clicks_daily_link_id_day_source_pk" PRIMARY KEY("link_id","day","source")
);
--> statement-breakpoint
CREATE TABLE "link_page_views_daily" (
	"course_id" uuid NOT NULL,
	"day" date NOT NULL,
	"source" "link_traffic_source" NOT NULL,
	"views" integer NOT NULL,
	CONSTRAINT "link_page_views_daily_course_id_day_source_pk" PRIMARY KEY("course_id","day","source")
);
--> statement-breakpoint
ALTER TABLE "course_link_pages" ADD CONSTRAINT "course_link_pages_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_link_pages" ADD CONSTRAINT "course_link_pages_avatar_file_id_files_id_fk" FOREIGN KEY ("avatar_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_link_pages" ADD CONSTRAINT "course_link_pages_cover_file_id_files_id_fk" FOREIGN KEY ("cover_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_link_pages" ADD CONSTRAINT "course_link_pages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_link_sections" ADD CONSTRAINT "course_link_sections_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_links" ADD CONSTRAINT "course_links_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_links" ADD CONSTRAINT "course_links_section_id_course_link_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."course_link_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_links" ADD CONSTRAINT "course_links_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_links" ADD CONSTRAINT "course_links_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_links" ADD CONSTRAINT "course_links_thumbnail_file_id_files_id_fk" FOREIGN KEY ("thumbnail_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_links" ADD CONSTRAINT "course_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_social_links" ADD CONSTRAINT "course_social_links_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_clicks_daily" ADD CONSTRAINT "link_clicks_daily_link_id_course_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."course_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_page_views_daily" ADD CONSTRAINT "link_page_views_daily_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_link_sections_course" ON "course_link_sections" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_links_course" ON "course_links" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_links_one_featured" ON "course_links" USING btree ("course_id") WHERE "course_links"."is_featured";--> statement-breakpoint
CREATE INDEX "course_social_links_course" ON "course_social_links" USING btree ("course_id");