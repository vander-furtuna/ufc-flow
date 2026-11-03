import {
  messageStatusSchema,
  reportReasonSchema,
  reportStatusSchema,
  restrictionTypeSchema,
} from '@ufc-flow/contracts'
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
  uniqueIndex,
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

const values = <T extends string>(options: readonly T[]) =>
  options as unknown as [T, ...T[]]

export const reportReason = pgEnum(
  'report_reason',
  values(reportReasonSchema.options),
)
export const reportStatus = pgEnum(
  'report_status',
  values(reportStatusSchema.options),
)
export const restrictionType = pgEnum(
  'restriction_type',
  values(restrictionTypeSchema.options),
)
export const moderationAction = pgEnum('moderation_action', [
  'HIDE_MESSAGE',
  'REMOVE_MESSAGE',
  'RESTORE_MESSAGE',
  'MUTE_USER',
  'BAN_USER',
  'LIFT_RESTRICTION',
])

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

export const messageReports = pgTable(
  'message_reports',
  {
    id: uuid('id').primaryKey(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    // A denúncia fica mesmo se a conta de quem denunciou sumir
    reporterId: uuid('reporter_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reason: reportReason('reason').notNull(),
    details: text('details'),
    contentSnapshot: text('content_snapshot').notNull(),
    status: reportStatus('status').notNull().default('OPEN'),
    resolvedBy: uuid('resolved_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    resolvedAt: instant('resolved_at'),
    createdAt: instant('created_at').notNull(),
  },
  (table) => [
    // Uma por pessoa
    uniqueIndex('message_reports_one_per_person').on(
      table.messageId,
      table.reporterId,
    ),
    index('message_reports_open')
      .on(table.messageId)
      .where(sql`${table.status} = 'OPEN'`),
  ],
)

export const moderationActions = pgTable(
  'moderation_actions',
  {
    id: uuid('id').primaryKey(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    moderatorId: uuid('moderator_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: moderationAction('action').notNull(),
    targetMessageId: uuid('target_message_id').references(() => messages.id, {
      onDelete: 'set null',
    }),
    targetUserId: uuid('target_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reportId: uuid('report_id').references(() => messageReports.id, {
      onDelete: 'set null',
    }),
    reason: text('reason').notNull(),
    createdAt: instant('created_at').notNull(),
  },
  (table) => [
    index('moderation_actions_course').on(table.courseId, table.createdAt),
    index('moderation_actions_message').on(table.targetMessageId),
  ],
)

export const userCourseRestrictions = pgTable(
  'user_course_restrictions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    type: restrictionType('type').notNull(),
    reason: text('reason').notNull(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: instant('created_at').notNull(),
    expiresAt: instant('expires_at'),
    liftedAt: instant('lifted_at'),
  },
  (table) => [
    index('user_course_restrictions_active')
      .on(table.userId, table.courseId)
      .where(sql`${table.liftedAt} IS NULL`),
  ],
)
