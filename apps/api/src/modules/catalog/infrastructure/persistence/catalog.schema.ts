import type { RequirementExpr } from '@ufc-flow/academic-core'
import {
  branchTypeSchema,
  curriculumImportSourceSchema,
  curriculumImportStatusSchema,
  curriculumNatureSchema,
  curriculumStatusSchema,
  sigaaCourseModalitySchema,
  subjectTypeSchema,
  type CurriculumImportV1,
} from '@ufc-flow/contracts'
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'

import type { ReviewPoint } from '../../domain/review-points'
import { users } from '../../../identity/infrastructure/persistence/identity.schema'

// Os valores dos enums vêm do packages/contracts (tupla não vazia para o
// pgEnum)
const values = <T extends string>(options: readonly T[]) =>
  options as unknown as [T, ...T[]]

export const sigaaCourseModality = pgEnum(
  'sigaa_course_modality',
  values(sigaaCourseModalitySchema.options),
)
export const curriculumStatus = pgEnum(
  'curriculum_status',
  values(curriculumStatusSchema.options),
)
export const subjectType = pgEnum(
  'subject_type',
  values(subjectTypeSchema.options),
)
export const curriculumNature = pgEnum(
  'curriculum_nature',
  values(curriculumNatureSchema.options),
)
export const branchType = pgEnum(
  'branch_type',
  values(branchTypeSchema.options),
)
export const requirementKind = pgEnum('requirement_kind', ['PRE', 'CO'])
export const curriculumImportSource = pgEnum(
  'curriculum_import_source',
  values(curriculumImportSourceSchema.options),
)
export const curriculumImportStatus = pgEnum(
  'curriculum_import_status',
  values(curriculumImportStatusSchema.options),
)

const instant = (name: string) => timestamp(name, { withTimezone: true })

const createdAt = () =>
  instant('created_at')
    .notNull()
    .default(sql`now()`)

const updatedAt = () =>
  instant('updated_at')
    .notNull()
    .default(sql`now()`)

const hours = (name: string) => integer(name).notNull()

// Autoria: some com a conta (LGPD), o registro fica
const author = (name: string) =>
  uuid(name).references((): AnyPgColumn => users.id, { onDelete: 'set null' })

export const campuses = pgTable('campuses', {
  id: uuid('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
})

// Lista pública de cursos do SIGAA (D34). O nome do coordenador não é
// guardado.
export const sigaaCourses = pgTable('sigaa_courses', {
  sigaaId: text('sigaa_id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  // O select da tela de busca não traz modalidade nem nome da unidade
  modality: sigaaCourseModality('modality'),
  unitAcronym: text('unit_acronym'),
  unitName: text('unit_name'),
  firstSeenAt: instant('first_seen_at').notNull(),
  lastSeenAt: instant('last_seen_at').notNull(),
  removedAt: instant('removed_at'),
})

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey(),
  sigaaId: text('sigaa_id')
    .notNull()
    .unique()
    .references(() => sigaaCourses.sigaaId, { onDelete: 'restrict' }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color'),
  campusId: uuid('campus_id')
    .notNull()
    .references(() => campuses.id, { onDelete: 'restrict' }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const curricula = pgTable(
  'curricula',
  {
    id: uuid('id').primaryKey(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    effectiveTerm: text('effective_term').notNull(),
    sigaaId: text('sigaa_id'),
    slug: text('slug').notNull(),
    matrixName: text('matrix_name').notNull(),
    unitName: text('unit_name'),
    status: curriculumStatus('status').notNull(),
    isCurrent: boolean('is_current').notNull().default(false),
    // Veio do courses.ts (requisitos sem OU): reimportar pela extensão
    needsReimport: boolean('needs_reimport').notNull().default(false),
    minTotalHours: hours('min_total_hours'),
    maxTotalHours: integer('max_total_hours'),
    mandatoryHours: hours('mandatory_hours'),
    optativeHours: hours('optative_hours'),
    extensionHours: hours('extension_hours'),
    specificActivityHours: hours('specific_activity_hours'),
    maxFreeOptativeHours: hours('max_free_optative_hours'),
    minEmphases: integer('min_emphases'),
    maxEmphases: integer('max_emphases'),
    minPeriods: hours('min_periods'),
    avgPeriods: hours('avg_periods'),
    maxPeriods: hours('max_periods'),
    periodMinHours: hours('period_min_hours'),
    periodAvgHours: hours('period_avg_hours'),
    periodMaxHours: hours('period_max_hours'),
    publishedAt: instant('published_at'),
    publishedBy: author('published_by'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique('curricula_course_slug').on(table.courseId, table.slug),
    uniqueIndex('curricula_one_current')
      .on(table.courseId)
      .where(sql`${table.isCurrent}`),
    check(
      'curricula_current_is_published',
      sql`NOT ${table.isCurrent} OR ${table.status} = 'PUBLISHED'`,
    ),
  ],
)

export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').primaryKey(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    // Nome sem acentos e em minúsculas (normalizeSearchText), para a busca
    searchName: text('search_name').notNull(),
    type: subjectType('type').notNull(),
    workloadHours: hours('workload_hours'),
    theoryHours: hours('theory_hours'),
    labHours: hours('lab_hours'),
    eadHours: hours('ead_hours'),
    extensionHours: hours('extension_hours'),
    credits: hours('credits'),
    durationTerms: smallint('duration_terms').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check('subjects_duration_terms', sql`${table.durationTerms} IN (1, 2)`),
    index('subjects_search_name_trgm').using(
      'gin',
      sql`${table.searchName} gin_trgm_ops`,
    ),
    index('subjects_code_trgm').using('gin', sql`${table.code} gin_trgm_ops`),
  ],
)

export const curriculumSubjects = pgTable(
  'curriculum_subjects',
  {
    id: uuid('id').primaryKey(),
    curriculumId: uuid('curriculum_id')
      .notNull()
      .references(() => curricula.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'restrict' }),
    semester: integer('semester'),
    semesterInferred: boolean('semester_inferred').notNull().default(false),
    nature: curriculumNature('nature').notNull(),
    prerequisiteExpr: jsonb('prerequisite_expr').$type<RequirementExpr>(),
    corequisiteExpr: jsonb('corequisite_expr').$type<RequirementExpr>(),
    createdAt: createdAt(),
  },
  (table) => [
    unique('curriculum_subjects_unique').on(
      table.curriculumId,
      table.subjectId,
    ),
  ],
)

// Derivadas da árvore a cada gravação: servem ao grafo e à consulta "o que
// esta disciplina libera"
export const curriculumSubjectRequirements = pgTable(
  'curriculum_subject_requirements',
  {
    curriculumSubjectId: uuid('curriculum_subject_id')
      .notNull()
      .references(() => curriculumSubjects.id, { onDelete: 'cascade' }),
    kind: requirementKind('kind').notNull(),
    requiredCode: text('required_code').notNull(),
    requiredSubjectId: uuid('required_subject_id').references(
      () => subjects.id,
      { onDelete: 'set null' },
    ),
  },
  (table) => [
    primaryKey({
      columns: [table.curriculumSubjectId, table.kind, table.requiredCode],
    }),
    index('curriculum_subject_requirements_code').on(table.requiredCode),
  ],
)

export const branches = pgTable(
  'branches',
  {
    id: uuid('id').primaryKey(),
    curriculumId: uuid('curriculum_id')
      .notNull()
      .references(() => curricula.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => branches.id, {
      onDelete: 'cascade',
    }),
    type: branchType('type').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    sigaaCode: text('sigaa_code'),
    color: text('color'),
    mandatoryHours: integer('mandatory_hours'),
    minHours: integer('min_hours'),
    maxHours: integer('max_hours'),
    minComponents: integer('min_components'),
    maxComponents: integer('max_components'),
    position: integer('position').notNull(),
  },
  (table) => [index('branches_curriculum').on(table.curriculumId)],
)

export const curriculumSubjectBranches = pgTable(
  'curriculum_subject_branches',
  {
    curriculumSubjectId: uuid('curriculum_subject_id')
      .notNull()
      .references(() => curriculumSubjects.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    nature: curriculumNature('nature').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.curriculumSubjectId, table.branchId] }),
  ],
)

export const subjectEquivalences = pgTable('subject_equivalences', {
  subjectId: uuid('subject_id')
    .primaryKey()
    .references(() => subjects.id, { onDelete: 'cascade' }),
  expr: jsonb('expr').$type<RequirementExpr>().notNull(),
})

export const subjectEquivalenceCodes = pgTable(
  'subject_equivalence_codes',
  {
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    equivalentCode: text('equivalent_code').notNull(),
    equivalentSubjectId: uuid('equivalent_subject_id').references(
      () => subjects.id,
      { onDelete: 'set null' },
    ),
  },
  (table) => [primaryKey({ columns: [table.subjectId, table.equivalentCode] })],
)

export const curriculumImports = pgTable(
  'curriculum_imports',
  {
    id: uuid('id').primaryKey(),
    courseId: uuid('course_id').references(() => courses.id, {
      onDelete: 'set null',
    }),
    // Curso do arquivo, para achar as pendentes quando o curso for criado
    courseSigaaId: text('course_sigaa_id').notNull(),
    curriculumId: uuid('curriculum_id').references(() => curricula.id, {
      onDelete: 'set null',
    }),
    schemaVersion: integer('schema_version').notNull(),
    source: curriculumImportSource('source').notNull(),
    payload: jsonb('payload').$type<CurriculumImportV1>().notNull(),
    status: curriculumImportStatus('status').notNull(),
    // Pontos para revisar (divergências com o catálogo e sugestões)
    conflicts: jsonb('conflicts')
      .$type<ReviewPoint[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    importedBy: author('imported_by'),
    createdAt: createdAt(),
    appliedAt: instant('applied_at'),
  },
  (table) => [
    index('curriculum_imports_status').on(table.status, table.createdAt),
    index('curriculum_imports_pending').on(table.courseSigaaId, table.status),
    index('curriculum_imports_curriculum').on(table.curriculumId),
  ],
)
