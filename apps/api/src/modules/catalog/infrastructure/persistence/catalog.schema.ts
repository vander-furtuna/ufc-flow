import { sql } from 'drizzle-orm'
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// Catálogo mínimo da fase 4: só campus e curso, para os pedidos de moderação.
// O resto do catálogo (ECs, disciplinas, vertentes) chega na fase 5.
export const campuses = pgTable('campuses', {
  id: uuid('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
})

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey(),
  // Na fase 5 vira FK para sigaa_courses (D34)
  sigaaId: text('sigaa_id').notNull().unique(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color'),
  campusId: uuid('campus_id')
    .notNull()
    .references(() => campuses.id, { onDelete: 'restrict' }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
})
