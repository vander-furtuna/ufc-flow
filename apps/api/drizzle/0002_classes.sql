CREATE TYPE "public"."scrape_status" AS ENUM('RUNNING', 'SUCCESS', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."scrape_trigger" AS ENUM('SCHEDULED', 'MANUAL');--> statement-breakpoint
CREATE TABLE "academic_terms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"year" smallint NOT NULL,
	"period" smallint NOT NULL,
	"starts_at" date NOT NULL,
	"ends_at" date NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	CONSTRAINT "academic_terms_code_unique" UNIQUE("code"),
	CONSTRAINT "academic_terms_period" CHECK ("academic_terms"."period" IN (1, 2)),
	CONSTRAINT "academic_terms_dates" CHECK ("academic_terms"."starts_at" < "academic_terms"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "class_section_instructors" (
	"class_section_id" uuid NOT NULL,
	"instructor_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "class_section_instructors_class_section_id_instructor_id_pk" PRIMARY KEY("class_section_id","instructor_id")
);
--> statement-breakpoint
CREATE TABLE "class_section_offers" (
	"class_section_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"reserved_seats" integer NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	CONSTRAINT "class_section_offers_class_section_id_course_id_pk" PRIMARY KEY("class_section_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "class_section_slots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"class_section_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	CONSTRAINT "class_section_slots_weekday" CHECK ("class_section_slots"."weekday" BETWEEN 1 AND 7)
);
--> statement-breakpoint
CREATE TABLE "class_sections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"term_id" uuid NOT NULL,
	"subject_code" text NOT NULL,
	"subject_name" text NOT NULL,
	"subject_id" uuid,
	"section_code" text NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"fingerprint" text NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"removed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_sections_natural_key" UNIQUE("term_id","subject_code","section_code")
);
--> statement-breakpoint
CREATE TABLE "instructors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"siape" text NOT NULL,
	"name" text NOT NULL,
	"profile_url" text NOT NULL,
	CONSTRAINT "instructors_siape_unique" UNIQUE("siape")
);
--> statement-breakpoint
CREATE TABLE "scrape_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"course_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"trigger" "scrape_trigger" NOT NULL,
	"status" "scrape_status" NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"sections_seen" integer DEFAULT 0 NOT NULL,
	"sections_changed" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "class_section_instructors" ADD CONSTRAINT "class_section_instructors_class_section_id_class_sections_id_fk" FOREIGN KEY ("class_section_id") REFERENCES "public"."class_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_section_instructors" ADD CONSTRAINT "class_section_instructors_instructor_id_instructors_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_section_offers" ADD CONSTRAINT "class_section_offers_class_section_id_class_sections_id_fk" FOREIGN KEY ("class_section_id") REFERENCES "public"."class_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_section_offers" ADD CONSTRAINT "class_section_offers_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_section_slots" ADD CONSTRAINT "class_section_slots_class_section_id_class_sections_id_fk" FOREIGN KEY ("class_section_id") REFERENCES "public"."class_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."academic_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."academic_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_terms_current" ON "academic_terms" USING btree ("is_current") WHERE "academic_terms"."is_current";--> statement-breakpoint
CREATE INDEX "class_section_offers_course" ON "class_section_offers" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "class_section_slots_section" ON "class_section_slots" USING btree ("class_section_id");--> statement-breakpoint
CREATE INDEX "scrape_runs_course_term" ON "scrape_runs" USING btree ("course_id","term_id","started_at");