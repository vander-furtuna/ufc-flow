CREATE TYPE "public"."schedule_color" AS ENUM('red', 'orange', 'lime', 'green', 'emerald', 'teal', 'cyan', 'blue', 'violet', 'fuchsia', 'pink', 'rose');--> statement-breakpoint
CREATE TABLE "schedule_items" (
	"schedule_id" uuid NOT NULL,
	"class_section_id" uuid NOT NULL,
	"subject_code" text NOT NULL,
	"color" "schedule_color" NOT NULL,
	"slots_fingerprint" text NOT NULL,
	"added_at" timestamp with time zone NOT NULL,
	CONSTRAINT "schedule_items_schedule_id_class_section_id_pk" PRIMARY KEY("schedule_id","class_section_id"),
	CONSTRAINT "schedule_items_subject" UNIQUE("schedule_id","subject_code")
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"curriculum_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schedule_items" ADD CONSTRAINT "schedule_items_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_items" ADD CONSTRAINT "schedule_items_class_section_id_class_sections_id_fk" FOREIGN KEY ("class_section_id") REFERENCES "public"."class_sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_curriculum_id_curricula_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."academic_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "schedule_items_section" ON "schedule_items" USING btree ("class_section_id");--> statement-breakpoint
CREATE INDEX "schedules_user" ON "schedules" USING btree ("user_id","position");