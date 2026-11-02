import { scheduleColorSchema } from '@ufc-flow/contracts'
import { sql } from 'drizzle-orm'
import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

import {
  courses,
  curricula,
} from '../../../catalog/infrastructure/persistence/catalog.schema'
import {
  academicTerms,
  classSections,
} from '../../../classes/infrastructure/persistence/classes.schema'
import { users } from '../../../identity/infrastructure/persistence/identity.schema'

export const scheduleColor = pgEnum(
  'schedule_color',
  scheduleColorSchema.options as unknown as [string, ...string[]],
)

const instant = (name: string) => timestamp(name, { withTimezone: true })

// O id vem do cliente (UUID local), para a importação não duplicar (D2)
export const schedules = pgTable(
  'schedules',
  {
    id: uuid('id').primaryKey(),
    // Dado pessoal: some com a conta (LGPD)
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'restrict' }),
    // Agenda por EC (D71); só EC publicada, que não pode ser excluída
    curriculumId: uuid('curriculum_id')
      .notNull()
      .references(() => curricula.id, { onDelete: 'restrict' }),
    // Semestre só é excluído sem turmas, então a agenda dele está vazia
    termId: uuid('term_id')
      .notNull()
      .references(() => academicTerms.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: smallint('position').notNull().default(0),
    createdAt: instant('created_at').notNull(),
    updatedAt: instant('updated_at')
      .notNull()
      .default(sql`now()`),
  },
  (table) => [index('schedules_user').on(table.userId, table.position)],
)

export const scheduleItems = pgTable(
  'schedule_items',
  {
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => schedules.id, { onDelete: 'cascade' }),
    classSectionId: uuid('class_section_id')
      .notNull()
      .references(() => classSections.id, { onDelete: 'restrict' }),
    subjectCode: text('subject_code').notNull(),
    color: scheduleColor('color').notNull(),
    // Fingerprint da turma quando entrou; diferente do atual = horário mudou
    slotsFingerprint: text('slots_fingerprint').notNull(),
    addedAt: instant('added_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.scheduleId, table.classSectionId] }),
    unique('schedule_items_subject').on(table.scheduleId, table.subjectCode),
    index('schedule_items_section').on(table.classSectionId),
  ],
)
