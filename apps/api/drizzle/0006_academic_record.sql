CREATE TYPE "public"."activity_kind" AS ENUM('COMPLEMENTARY', 'EXTENSION');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('ACTIVE', 'TRANSFERRED', 'CONCLUDED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('CURSANDO', 'APROVADO', 'REPROVADO', 'TRANCADA', 'SUPRIMIDA', 'APROVEITADA');--> statement-breakpoint
CREATE TABLE "activity_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"curriculum_id" uuid NOT NULL,
	"kind" "activity_kind" NOT NULL,
	"name" text NOT NULL,
	"max_hours" integer,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "activity_categories_max_hours" CHECK ("activity_categories"."max_hours" > 0)
);
--> statement-breakpoint
CREATE TABLE "student_activity_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"kind" "activity_kind" NOT NULL,
	"category_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"institution" text,
	"hours" integer NOT NULL,
	"started_on" date NOT NULL,
	"ended_on" date,
	"certificate_file_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "student_activity_records_hours" CHECK ("student_activity_records"."hours" > 0),
	CONSTRAINT "student_activity_records_period" CHECK ("student_activity_records"."ended_on" IS NULL OR "student_activity_records"."ended_on" >= "student_activity_records"."started_on")
);
--> statement-breakpoint
CREATE TABLE "student_enrollments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"curriculum_id" uuid NOT NULL,
	"registration_number" text NOT NULL,
	"status" "enrollment_status" NOT NULL,
	"is_current" boolean NOT NULL,
	"entry_term" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "student_enrollments_registration_number" CHECK ("student_enrollments"."registration_number" ~ '^[0-9]{4,10}$'),
	CONSTRAINT "student_enrollments_entry_term" CHECK ("student_enrollments"."entry_term" ~ '^[1-9][0-9]{3}\.[12]$')
);
--> statement-breakpoint
CREATE TABLE "student_subject_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"term_code" text NOT NULL,
	"status" "record_status" NOT NULL,
	"grade" numeric(4, 2),
	"source_record_id" uuid,
	"origin_note" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "student_subject_records_attempt" UNIQUE("enrollment_id","subject_id","term_code"),
	CONSTRAINT "student_subject_records_term" CHECK ("student_subject_records"."term_code" ~ '^[1-9][0-9]{3}\.[12]$'),
	CONSTRAINT "student_subject_records_grade" CHECK ("student_subject_records"."grade" BETWEEN 0 AND 10)
);
--> statement-breakpoint
ALTER TABLE "activity_categories" ADD CONSTRAINT "activity_categories_curriculum_id_curricula_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_activity_records" ADD CONSTRAINT "student_activity_records_enrollment_id_student_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."student_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_activity_records" ADD CONSTRAINT "student_activity_records_category_id_activity_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."activity_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_activity_records" ADD CONSTRAINT "student_activity_records_certificate_file_id_files_id_fk" FOREIGN KEY ("certificate_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_curriculum_id_curricula_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_subject_records" ADD CONSTRAINT "student_subject_records_enrollment_id_student_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."student_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_subject_records" ADD CONSTRAINT "student_subject_records_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_subject_records" ADD CONSTRAINT "student_subject_records_source_record_id_student_subject_records_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."student_subject_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_categories_curriculum" ON "activity_categories" USING btree ("curriculum_id");--> statement-breakpoint
CREATE INDEX "student_activity_records_enrollment" ON "student_activity_records" USING btree ("enrollment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_enrollments_one_current" ON "student_enrollments" USING btree ("user_id") WHERE "student_enrollments"."is_current";--> statement-breakpoint
CREATE INDEX "student_enrollments_curriculum" ON "student_enrollments" USING btree ("curriculum_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_subject_records_one_open" ON "student_subject_records" USING btree ("enrollment_id","subject_id") WHERE "student_subject_records"."status" = 'CURSANDO';