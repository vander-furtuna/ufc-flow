import { messageStatusSchema } from '@ufc-flow/contracts'
import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'

import {
  courses,
  subjects,
} from '../../../catalog/infrastructure/persistence/catalog.schema'
import { users } from '../../../identity/infrastructure/persistence/identity.schema'

export const messageStatus = pgEnum(
  'message_status',
  messageStatusSchema.options as unknown as [string, ...string[]],
)

const instant = (name: string) => timestamp(name, { withTimezone: true })

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    // A conta some e a conversa fica (LGPD)
    authorId: uuid('author_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    parentId: uuid('parent_id').references((): AnyPgColumn => messages.id, {
      onDelete: 'cascade',
    }),
    rootId: uuid('root_id').references((): AnyPgColumn => messages.id, {
      onDelete: 'cascade',
    }),
    content: text('content').notNull(),
    replyCount: integer('reply_count').notNull().default(0),
    likeCount: integer('like_count').notNull().default(0),
    status: messageStatus('status').notNull().default('VISIBLE'),
    createdAt: instant('created_at').notNull(),
    editedAt: instant('edited_at'),
    removedAt: instant('removed_at'),
    removedBy: uuid('removed_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    removalReason: text('removal_reason'),
  },
  (table) => [
    // Timeline do curso: só as raízes, das mais novas
    index('messages_timeline')
      .on(table.courseId, table.createdAt.desc(), table.id.desc())
      .where(sql`${table.parentId} IS NULL`),
    index('messages_replies').on(table.parentId, table.createdAt, table.id),
    index('messages_root').on(table.rootId),
    // Limite de envio por pessoa
    index('messages_author_created').on(table.authorId, table.createdAt),
    check('messages_content_length', sql`char_length(${table.content}) <= 500`),
    check(
      'messages_thread',
      sql`(${table.parentId} IS NULL) = (${table.rootId} IS NULL)`,
    ),
    check(
      'messages_counts',
      sql`${table.replyCount} >= 0 AND ${table.likeCount} >= 0`,
    ),
  ],
)

export const messageLikes = pgTable(
  'message_likes',
  {
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: instant('created_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.messageId, table.userId] })],
)

export const messageSubjectMentions = pgTable(
  'message_subject_mentions',
  {
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.messageId, table.subjectId] }),
    // Aba "Discussões" e mais citadas
    index('message_subject_mentions_subject').on(table.subjectId),
  ],
)
