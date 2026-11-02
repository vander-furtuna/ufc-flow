import { notificationTypeSchema } from '@ufc-flow/contracts'
import { sql } from 'drizzle-orm'
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { courses } from '../../../catalog/infrastructure/persistence/catalog.schema'
import { users } from '../../../identity/infrastructure/persistence/identity.schema'

export const notificationType = pgEnum(
  'notification_type',
  notificationTypeSchema.options as unknown as [string, ...string[]],
)

const instant = (name: string) => timestamp(name, { withTimezone: true })

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey(),
    // Dado pessoal: some com a conta (LGPD)
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationType('type').notNull(),
    actorId: uuid('actor_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    courseId: uuid('course_id').references(() => courses.id, {
      onDelete: 'set null',
    }),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    // Cópia do momento do evento (formato por tipo nos contratos)
    data: jsonb('data').notNull(),
    groupKey: text('group_key'),
    readAt: instant('read_at'),
    createdAt: instant('created_at').notNull(),
    updatedAt: instant('updated_at').notNull(),
  },
  (table) => [
    // A lista segue a última atualização (agrupadas sobem)
    index('notifications_user_updated').on(
      table.userId,
      table.updatedAt.desc(),
      table.id.desc(),
    ),
    index('notifications_unread')
      .on(table.userId)
      .where(sql`${table.readAt} IS NULL`),
    // Uma não lida por chave de agrupamento
    uniqueIndex('notifications_unread_group')
      .on(table.userId, table.groupKey)
      .where(sql`${table.readAt} IS NULL`),
  ],
)
