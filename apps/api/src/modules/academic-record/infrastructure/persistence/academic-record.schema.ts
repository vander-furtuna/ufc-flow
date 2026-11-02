import {
  activityKindSchema,
  enrollmentStatusSchema,
  recordStatusSchema,
} from '@ufc-flow/contracts'
import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import {
  courses,
  curricula,
  subjects,
} from '../../../catalog/infrastructure/persistence/catalog.schema'
import { files } from '../../../files/infrastructure/persistence/files.schema'
import { users } from '../../../identity/infrastructure/persistence/identity.schema'

const values = <T extends string>(options: readonly T[]) =>
  options as unknown as [T, ...T[]]

export const enrollmentStatus = pgEnum(
  'enrollment_status',
  values(enrollmentStatusSchema.options),
)
export const recordStatus = pgEnum(
  'record_status',
  values(recordStatusSchema.options),
)
export const activityKind = pgEnum(
  'activity_kind',
  values(activityKindSchema.options),
)

const instant = (name: string) => timestamp(name, { withTimezone: true })
const day = (name: string) => date(name, { mode: 'string' })
const TERM = sql.raw(`'^[1-9][0-9]{3}\\.[12]$'`)

export const studentEnrollments = pgTable(
  'student_enrollments',
  {
    id: uuid('id').primaryKey(),
    // Dado pessoal: some com a conta (LGPD)
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'restrict' }),
    // EC com matrícula não pode ser excluída (e fica travada no editor)
    curriculumId: uuid('curriculum_id')
      .notNull()
      .references(() => curricula.id, { onDelete: 'restrict' }),
    // Só dígitos e não é único: a UFC reaproveita números entre cursos
    registrationNumber: text('registration_number').notNull(),
    status: enrollmentStatus('status').notNull(),
    isCurrent: boolean('is_current').notNull(),
    // Código do semestre de entrada ("2023.1"), sem FK (D76)
    entryTerm: text('entry_term'),
    createdAt: instant('created_at').notNull(),
    updatedAt: instant('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('student_enrollments_one_current')
      .on(table.userId)
      .where(sql`${table.isCurrent}`),
    index('student_enrollments_curriculum').on(table.curriculumId),
    check(
      'student_enrollments_registration_number',
      sql`${table.registrationNumber} ~ '^[0-9]{4,10}$'`,
    ),
    check('student_enrollments_entry_term', sql`${table.entryTerm} ~ ${TERM}`),
  ],
)

export const studentSubjectRecords = pgTable(
  'student_subject_records',
  {
    id: uuid('id').primaryKey(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => studentEnrollments.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'restrict' }),
    // O semestre fica como código: o histórico passado aceita semestres que
    // não estão em academic_terms (D76)
    termCode: text('term_code').notNull(),
    status: recordStatus('status').notNull(),
    grade: numeric('grade', { precision: 4, scale: 2, mode: 'number' }),
    sourceRecordId: uuid('source_record_id').references(
      (): AnyPgColumn => studentSubjectRecords.id,
      { onDelete: 'set null' },
    ),
    originNote: text('origin_note'),
    createdAt: instant('created_at').notNull(),
    updatedAt: instant('updated_at').notNull(),
  },
  (table) => [
    unique('student_subject_records_attempt').on(
      table.enrollmentId,
      table.subjectId,
      table.termCode,
    ),
    // No máximo um CURSANDO por disciplina na matrícula
    uniqueIndex('student_subject_records_one_open')
      .on(table.enrollmentId, table.subjectId)
      .where(sql`${table.status} = 'CURSANDO'`),
    check('student_subject_records_term', sql`${table.termCode} ~ ${TERM}`),
    check(
      'student_subject_records_grade',
      sql`${table.grade} BETWEEN 0 AND 10`,
    ),
  ],
)

export const activityCategories = pgTable(
  'activity_categories',
  {
    id: uuid('id').primaryKey(),
    curriculumId: uuid('curriculum_id')
      .notNull()
      .references(() => curricula.id, { onDelete: 'cascade' }),
    kind: activityKind('kind').notNull(),
    name: text('name').notNull(),
    maxHours: integer('max_hours'),
    position: integer('position').notNull().default(0),
  },
  (table) => [
    index('activity_categories_curriculum').on(table.curriculumId),
    check('activity_categories_max_hours', sql`${table.maxHours} > 0`),
  ],
)

export const studentActivityRecords = pgTable(
  'student_activity_records',
  {
    id: uuid('id').primaryKey(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => studentEnrollments.id, { onDelete: 'cascade' }),
    kind: activityKind('kind').notNull(),
    // Categoria excluída: a atividade fica, sem teto
    categoryId: uuid('category_id').references(() => activityCategories.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    description: text('description'),
    institution: text('institution'),
    hours: integer('hours').notNull(),
    startedOn: day('started_on').notNull(),
    endedOn: day('ended_on'),
    certificateFileId: uuid('certificate_file_id').references(() => files.id, {
      onDelete: 'set null',
    }),
    createdAt: instant('created_at').notNull(),
    updatedAt: instant('updated_at').notNull(),
  },
  (table) => [
    index('student_activity_records_enrollment').on(table.enrollmentId),
    check('student_activity_records_hours', sql`${table.hours} > 0`),
    check(
      'student_activity_records_period',
      sql`${table.endedOn} IS NULL OR ${table.endedOn} >= ${table.startedOn}`,
    ),
  ],
)
