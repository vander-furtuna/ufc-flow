-- Busca por trecho de nome e código das disciplinas (índices GIN trigram)
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."branch_type" AS ENUM('SLOPE', 'EMPHASIS', 'SPECIFIC_GROUP');--> statement-breakpoint
CREATE TYPE "public"."curriculum_import_source" AS ENUM('EXTENSION', 'UPLOAD');--> statement-breakpoint
CREATE TYPE "public"."curriculum_import_status" AS ENUM('RECEIVED', 'APPLIED', 'FAILED', 'DISCARDED');--> statement-breakpoint
CREATE TYPE "public"."curriculum_nature" AS ENUM('MANDATORY', 'OPTATIVE');--> statement-breakpoint
CREATE TYPE "public"."curriculum_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."requirement_kind" AS ENUM('PRE', 'CO');--> statement-breakpoint
CREATE TYPE "public"."sigaa_course_modality" AS ENUM('IN_PERSON', 'DISTANCE');--> statement-breakpoint
CREATE TYPE "public"."subject_type" AS ENUM('DISCIPLINE', 'COMPLEMENTARY_ACTIVITY', 'FINAL_PROJECT', 'INTERNSHIP', 'EXTENSION_UNIT', 'MODULE', 'ADVANCED_TOPIC', 'SEMINAR', 'TUTORING', 'INTEGRATIVE_ACTIVITY', 'OTHER');--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"curriculum_id" uuid NOT NULL,
	"parent_id" uuid,
	"type" "branch_type" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sigaa_code" text,
	"color" text,
	"mandatory_hours" integer,
	"min_hours" integer,
	"max_hours" integer,
	"min_components" integer,
	"max_components" integer,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curricula" (
	"id" uuid PRIMARY KEY NOT NULL,
	"course_id" uuid NOT NULL,
	"code" text NOT NULL,
	"effective_term" text NOT NULL,
	"sigaa_id" text,
	"slug" text NOT NULL,
	"matrix_name" text NOT NULL,
	"unit_name" text,
	"status" "curriculum_status" NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"needs_reimport" boolean DEFAULT false NOT NULL,
	"min_total_hours" integer NOT NULL,
	"max_total_hours" integer,
	"mandatory_hours" integer NOT NULL,
	"optative_hours" integer NOT NULL,
	"extension_hours" integer NOT NULL,
	"specific_activity_hours" integer NOT NULL,
	"max_free_optative_hours" integer NOT NULL,
	"min_emphases" integer,
	"max_emphases" integer,
	"min_periods" integer NOT NULL,
	"avg_periods" integer NOT NULL,
	"max_periods" integer NOT NULL,
	"period_min_hours" integer NOT NULL,
	"period_avg_hours" integer NOT NULL,
	"period_max_hours" integer NOT NULL,
	"published_at" timestamp with time zone,
	"published_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curricula_course_slug" UNIQUE("course_id","slug"),
	CONSTRAINT "curricula_current_is_published" CHECK (NOT "curricula"."is_current" OR "curricula"."status" = 'PUBLISHED')
);
--> statement-breakpoint
CREATE TABLE "curriculum_imports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"course_id" uuid,
	"course_sigaa_id" text NOT NULL,
	"curriculum_id" uuid,
	"schema_version" integer NOT NULL,
	"source" "curriculum_import_source" NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "curriculum_import_status" NOT NULL,
	"conflicts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"imported_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "curriculum_subject_branches" (
	"curriculum_subject_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"nature" "curriculum_nature" NOT NULL,
	CONSTRAINT "curriculum_subject_branches_curriculum_subject_id_branch_id_pk" PRIMARY KEY("curriculum_subject_id","branch_id")
);
--> statement-breakpoint
CREATE TABLE "curriculum_subject_requirements" (
	"curriculum_subject_id" uuid NOT NULL,
	"kind" "requirement_kind" NOT NULL,
	"required_code" text NOT NULL,
	"required_subject_id" uuid,
	CONSTRAINT "curriculum_subject_requirements_curriculum_subject_id_kind_required_code_pk" PRIMARY KEY("curriculum_subject_id","kind","required_code")
);
--> statement-breakpoint
CREATE TABLE "curriculum_subjects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"curriculum_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"semester" integer,
	"semester_inferred" boolean DEFAULT false NOT NULL,
	"nature" "curriculum_nature" NOT NULL,
	"prerequisite_expr" jsonb,
	"corequisite_expr" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curriculum_subjects_unique" UNIQUE("curriculum_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "sigaa_courses" (
	"sigaa_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"modality" "sigaa_course_modality",
	"unit_acronym" text,
	"unit_name" text,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"removed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "subject_equivalence_codes" (
	"subject_id" uuid NOT NULL,
	"equivalent_code" text NOT NULL,
	"equivalent_subject_id" uuid,
	CONSTRAINT "subject_equivalence_codes_subject_id_equivalent_code_pk" PRIMARY KEY("subject_id","equivalent_code")
);
--> statement-breakpoint
CREATE TABLE "subject_equivalences" (
	"subject_id" uuid PRIMARY KEY NOT NULL,
	"expr" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"search_name" text NOT NULL,
	"type" "subject_type" NOT NULL,
	"workload_hours" integer NOT NULL,
	"theory_hours" integer NOT NULL,
	"lab_hours" integer NOT NULL,
	"ead_hours" integer NOT NULL,
	"extension_hours" integer NOT NULL,
	"credits" integer NOT NULL,
	"duration_terms" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_code_unique" UNIQUE("code"),
	CONSTRAINT "subjects_duration_terms" CHECK ("subjects"."duration_terms" IN (1, 2))
);
--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_curriculum_id_curricula_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_parent_id_branches_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curricula" ADD CONSTRAINT "curricula_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curricula" ADD CONSTRAINT "curricula_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_imports" ADD CONSTRAINT "curriculum_imports_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_imports" ADD CONSTRAINT "curriculum_imports_curriculum_id_curricula_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_imports" ADD CONSTRAINT "curriculum_imports_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_subject_branches" ADD CONSTRAINT "curriculum_subject_branches_curriculum_subject_id_curriculum_subjects_id_fk" FOREIGN KEY ("curriculum_subject_id") REFERENCES "public"."curriculum_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_subject_branches" ADD CONSTRAINT "curriculum_subject_branches_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_subject_requirements" ADD CONSTRAINT "curriculum_subject_requirements_curriculum_subject_id_curriculum_subjects_id_fk" FOREIGN KEY ("curriculum_subject_id") REFERENCES "public"."curriculum_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_subject_requirements" ADD CONSTRAINT "curriculum_subject_requirements_required_subject_id_subjects_id_fk" FOREIGN KEY ("required_subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_subjects" ADD CONSTRAINT "curriculum_subjects_curriculum_id_curricula_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_subjects" ADD CONSTRAINT "curriculum_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_equivalence_codes" ADD CONSTRAINT "subject_equivalence_codes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_equivalence_codes" ADD CONSTRAINT "subject_equivalence_codes_equivalent_subject_id_subjects_id_fk" FOREIGN KEY ("equivalent_subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_equivalences" ADD CONSTRAINT "subject_equivalences_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "branches_curriculum" ON "branches" USING btree ("curriculum_id");--> statement-breakpoint
CREATE UNIQUE INDEX "curricula_one_current" ON "curricula" USING btree ("course_id") WHERE "curricula"."is_current";--> statement-breakpoint
CREATE INDEX "curriculum_imports_status" ON "curriculum_imports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "curriculum_imports_pending" ON "curriculum_imports" USING btree ("course_sigaa_id","status");--> statement-breakpoint
CREATE INDEX "curriculum_imports_curriculum" ON "curriculum_imports" USING btree ("curriculum_id");--> statement-breakpoint
CREATE INDEX "curriculum_subject_requirements_code" ON "curriculum_subject_requirements" USING btree ("required_code");--> statement-breakpoint
CREATE INDEX "subjects_search_name_trgm" ON "subjects" USING gin ("search_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "subjects_code_trgm" ON "subjects" USING gin ("code" gin_trgm_ops);--> statement-breakpoint
-- Cursos da fase 4 ganham uma linha provisória no catálogo do SIGAA antes da
-- FK; a primeira leitura da lista pública completa os dados
INSERT INTO "sigaa_courses" ("sigaa_id", "name", "city", "first_seen_at", "last_seen_at")
SELECT c."sigaa_id", upper(c."name"), upper(ca."city"), now(), now()
FROM "courses" c JOIN "campuses" ca ON ca."id" = c."campus_id"
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_sigaa_id_sigaa_courses_sigaa_id_fk" FOREIGN KEY ("sigaa_id") REFERENCES "public"."sigaa_courses"("sigaa_id") ON DELETE restrict ON UPDATE no action;