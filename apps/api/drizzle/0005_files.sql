CREATE TYPE "public"."file_purpose" AS ENUM('AVATAR', 'POST_COVER', 'POST_IMAGE', 'CERTIFICATE', 'LINK_PAGE_IMAGE', 'LINK_THUMBNAIL', 'LINK_FILE');--> statement-breakpoint
CREATE TYPE "public"."file_status" AS ENUM('PENDING', 'ATTACHED');--> statement-breakpoint
CREATE TYPE "public"."file_visibility" AS ENUM('PUBLIC', 'PRIVATE');--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid,
	"course_id" uuid,
	"purpose" "file_purpose" NOT NULL,
	"visibility" "file_visibility" NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"sha256" text NOT NULL,
	"status" "file_status" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"attached_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "files_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_owner_created" ON "files" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "files_cleanup" ON "files" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_file_id_files_id_fk" FOREIGN KEY ("avatar_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;