import { scrapeStatusSchema, scrapeTriggerSchema } from '@ufc-flow/contracts'
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import {
  courses,
  subjects,
} from '../../../catalog/infrastructure/persistence/catalog.schema'

const values = <T extends string>(options: readonly T[]) =>
  options as unknown as [T, ...T[]]

export const scrapeTrigger = pgEnum(
  'scrape_trigger',
  values(scrapeTriggerSchema.options),
)
export const scrapeStatus = pgEnum(
  'scrape_status',
  values(scrapeStatusSchema.options),
)

const instant = (name: string) => timestamp(name, { withTimezone: true })
const day = (name: string) => date(name, { mode: 'string' })

export const academicTerms = pgTable(
  'academic_terms',
  {
    id: uuid('id').primaryKey(),
    code: text('code').notNull().unique(),
    year: smallint('year').notNull(),
    period: smallint('period').notNull(),
    startsAt: day('starts_at').notNull(),
    endsAt: day('ends_at').notNull(),
    isCurrent: boolean('is_current').notNull().default(false),
  },
  (table) => [
    check('academic_terms_period', sql`${table.period} IN (1, 2)`),
    check('academic_terms_dates', sql`${table.startsAt} < ${table.endsAt}`),
    // Um só semestre vigente
    uniqueIndex('academic_terms_current')
      .on(table.isCurrent)
      .where(sql`${table.isCurrent}`),
  ],
)

export const instructors = pgTable('instructors', {
  id: uuid('id').primaryKey(),
  siape: text('siape').notNull().unique(),
  name: text('name').notNull(),
  profileUrl: text('profile_url').notNull(),
})

export const classSections = pgTable(
  'class_sections',
  {
    id: uuid('id').primaryKey(),
    termId: uuid('term_id')
      .notNull()
      .references(() => academicTerms.id, { onDelete: 'restrict' }),
    subjectCode: text('subject_code').notNull(),
    // Nome como o SIGAA mostra: a disciplina pode não estar no catálogo
    subjectName: text('subject_name').notNull(),
    subjectId: uuid('subject_id').references(() => subjects.id, {
      onDelete: 'set null',
    }),
    sectionCode: text('section_code').notNull(),
    validFrom: day('valid_from'),
    validTo: day('valid_to'),
    fingerprint: text('fingerprint').notNull(),
    firstSeenAt: instant('first_seen_at').notNull(),
    lastSeenAt: instant('last_seen_at').notNull(),
    removedAt: instant('removed_at'),
    updatedAt: instant('updated_at')
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    unique('class_sections_natural_key').on(
      table.termId,
      table.subjectCode,
      table.sectionCode,
    ),
  ],
)

export const classSectionSlots = pgTable(
  'class_section_slots',
  {
    id: uuid('id').primaryKey(),
    classSectionId: uuid('class_section_id')
      .notNull()
      .references(() => classSections.id, { onDelete: 'cascade' }),
    weekday: smallint('weekday').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
  },
  (table) => [
    check('class_section_slots_weekday', sql`${table.weekday} BETWEEN 1 AND 7`),
    index('class_section_slots_section').on(table.classSectionId),
  ],
)

export const classSectionInstructors = pgTable(
  'class_section_instructors',
  {
    classSectionId: uuid('class_section_id')
      .notNull()
      .references(() => classSections.id, { onDelete: 'cascade' }),
    instructorId: uuid('instructor_id')
      .notNull()
      .references(() => instructors.id, { onDelete: 'restrict' }),
    // Ordem em que o SIGAA lista os docentes
    position: smallint('position').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.classSectionId, table.instructorId] }),
  ],
)

export const classSectionOffers = pgTable(
  'class_section_offers',
  {
    classSectionId: uuid('class_section_id')
      .notNull()
      .references(() => classSections.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    // Vagas reservadas para este curso dentro do total da turma
    reservedSeats: integer('reserved_seats').notNull(),
    lastSeenAt: instant('last_seen_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.classSectionId, table.courseId] }),
    index('class_section_offers_course').on(table.courseId),
  ],
)

export const scrapeRuns = pgTable(
  'scrape_runs',
  {
    id: uuid('id').primaryKey(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    termId: uuid('term_id')
      .notNull()
      .references(() => academicTerms.id, { onDelete: 'cascade' }),
    trigger: scrapeTrigger('trigger').notNull(),
    status: scrapeStatus('status').notNull(),
    startedAt: instant('started_at').notNull(),
    finishedAt: instant('finished_at'),
    sectionsSeen: integer('sections_seen').notNull().default(0),
    sectionsChanged: integer('sections_changed').notNull().default(0),
    error: text('error'),
  },
  (table) => [
    index('scrape_runs_course_term').on(
      table.courseId,
      table.termId,
      table.startedAt,
    ),
  ],
)
