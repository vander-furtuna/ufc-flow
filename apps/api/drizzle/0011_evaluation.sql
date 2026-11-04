CREATE TABLE "evaluation_criteria" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"low_label" text NOT NULL,
	"high_label" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "evaluation_criteria_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "subject_evaluation_scores" (
	"evaluation_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"score" smallint NOT NULL,
	CONSTRAINT "subject_evaluation_scores_evaluation_id_criterion_id_pk" PRIMARY KEY("evaluation_id","criterion_id"),
	CONSTRAINT "subject_evaluation_scores_range" CHECK ("subject_evaluation_scores"."score" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "subject_evaluations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"subject_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subject_evaluation_scores" ADD CONSTRAINT "subject_evaluation_scores_evaluation_id_subject_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."subject_evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_evaluation_scores" ADD CONSTRAINT "subject_evaluation_scores_criterion_id_evaluation_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."evaluation_criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_evaluations" ADD CONSTRAINT "subject_evaluations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_evaluations" ADD CONSTRAINT "subject_evaluations_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subject_evaluations_one_per_person" ON "subject_evaluations" USING btree ("user_id","subject_id") WHERE "subject_evaluations"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "subject_evaluations_subject" ON "subject_evaluations" USING btree ("subject_id");--> statement-breakpoint
-- Critérios sugeridos na modelagem (o admin edita, desativa e cria outros)
INSERT INTO "evaluation_criteria" ("id", "key", "label", "description", "low_label", "high_label", "position") VALUES
	(gen_random_uuid(), 'formacao', 'Contribuição para a formação', NULL, 'pouca', 'muita', 0),
	(gen_random_uuid(), 'pratica', 'Aplicação prática', NULL, 'pouca', 'muita', 1),
	(gen_random_uuid(), 'carga', 'Carga de trabalho', NULL, 'leve', 'pesada', 2),
	(gen_random_uuid(), 'dificuldade', 'Dificuldade', NULL, 'fácil', 'difícil', 3),
	(gen_random_uuid(), 'organizacao', 'Organização da disciplina', NULL, 'confusa', 'muito clara', 4);
