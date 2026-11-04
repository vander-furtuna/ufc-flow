import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { subjects } from '../../../catalog/infrastructure/persistence/catalog.schema'
import { users } from '../../../identity/infrastructure/persistence/identity.schema'

const instant = (name: string) => timestamp(name, { withTimezone: true })

export const evaluationCriteria = pgTable('evaluation_criteria', {
  id: uuid('id').primaryKey(),
  key: text('key').notNull().unique(),
  label: text('label').notNull(),
  description: text('description'),
  lowLabel: text('low_label').notNull(),
  highLabel: text('high_label').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  position: integer('position').notNull(),
})

export const subjectEvaluations = pgTable(
  'subject_evaluations',
  {
    id: uuid('id').primaryKey(),
    // A conta some e a avaliação continua nas médias (LGPD)
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    createdAt: instant('created_at').notNull(),
    updatedAt: instant('updated_at').notNull(),
  },
  (table) => [
    // Uma por pessoa e disciplina
    uniqueIndex('subject_evaluations_one_per_person')
      .on(table.userId, table.subjectId)
      .where(sql`${table.userId} IS NOT NULL`),
    index('subject_evaluations_subject').on(table.subjectId),
  ],
)

export const subjectEvaluationScores = pgTable(
  'subject_evaluation_scores',
  {
    evaluationId: uuid('evaluation_id')
      .notNull()
      .references(() => subjectEvaluations.id, { onDelete: 'cascade' }),
    criterionId: uuid('criterion_id')
      .notNull()
      .references(() => evaluationCriteria.id, { onDelete: 'cascade' }),
    score: smallint('score').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.evaluationId, table.criterionId] }),
    check(
      'subject_evaluation_scores_range',
      sql`${table.score} BETWEEN 1 AND 5`,
    ),
  ],
)
