import {
  moderatorRequestStatusSchema,
  userRoleSchema,
  userStatusSchema,
} from '@ufc-flow/contracts'
import { sql } from 'drizzle-orm'
import {
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'

import { courses } from '../../../catalog/infrastructure/persistence/catalog.schema'
import { files } from '../../../files/infrastructure/persistence/files.schema'

// Os valores dos enums vêm do packages/contracts. O pgEnum pede uma tupla
// não vazia, e o .options do Zod é tipado como array.
const values = <T extends string>(options: readonly T[]) =>
  options as unknown as [T, ...T[]]

export const userStatus = pgEnum(
  'user_status',
  values(userStatusSchema.options),
)
export const userRole = pgEnum('user_role', values(userRoleSchema.options))
export const moderatorRequestStatus = pgEnum(
  'moderator_request_status',
  values(moderatorRequestStatusSchema.options),
)
export const consentDocument = pgEnum('consent_document', ['TERMS', 'PRIVACY'])

const instant = (name: string) => timestamp(name, { withTimezone: true })

const createdAt = () =>
  instant('created_at')
    .notNull()
    .default(sql`now()`)

// LGPD: FKs de dados pessoais com ON DELETE CASCADE; de autoria, SET NULL
const owner = () =>
  uuid('user_id')
    .notNull()
    .references((): AnyPgColumn => users.id, { onDelete: 'cascade' })

const author = (name: string) =>
  uuid(name).references((): AnyPgColumn => users.id, { onDelete: 'set null' })

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    emailVerifiedAt: instant('email_verified_at'),
    // Foto de perfil (arquivo AVATAR ligado)
    avatarFileId: uuid('avatar_file_id').references(
      (): AnyPgColumn => files.id,
      { onDelete: 'set null' },
    ),
    status: userStatus('status').notNull().default('ACTIVE'),
    createdAt: createdAt(),
    updatedAt: instant('updated_at')
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    check('users_email_lowercase', sql`${table.email} = lower(${table.email})`),
  ],
)

export const userRoles = pgTable(
  'user_roles',
  {
    userId: owner(),
    role: userRole('role').notNull(),
    grantedBy: author('granted_by'),
    grantedAt: instant('granted_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.role] })],
)

export const moderatorRequests = pgTable(
  'moderator_requests',
  {
    id: uuid('id').primaryKey(),
    userId: owner(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    justification: text('justification').notNull(),
    status: moderatorRequestStatus('status').notNull().default('PENDING'),
    reviewedBy: author('reviewed_by'),
    reviewedAt: instant('reviewed_at'),
    reviewNote: text('review_note'),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('moderator_requests_one_pending')
      .on(table.userId, table.courseId)
      .where(sql`${table.status} = 'PENDING'`),
    index('moderator_requests_status').on(table.status, table.createdAt),
  ],
)

export const courseModerators = pgTable(
  'course_moderators',
  {
    id: uuid('id').primaryKey(),
    userId: owner(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    requestId: uuid('request_id')
      .notNull()
      .references(() => moderatorRequests.id, { onDelete: 'cascade' }),
    grantedBy: author('granted_by'),
    grantedAt: instant('granted_at').notNull(),
    revokedBy: author('revoked_by'),
    revokedAt: instant('revoked_at'),
  },
  (table) => [
    uniqueIndex('course_moderators_one_active')
      .on(table.userId, table.courseId)
      .where(sql`${table.revokedAt} IS NULL`),
  ],
)

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey(),
    userId: owner(),
    // Sessões de um mesmo login; reutilizar um token girado revoga a família
    familyId: uuid('family_id').notNull(),
    refreshTokenHash: text('refresh_token_hash').notNull().unique(),
    userAgent: text('user_agent'),
    ip: text('ip'),
    createdAt: createdAt(),
    expiresAt: instant('expires_at').notNull(),
    revokedAt: instant('revoked_at'),
    replacedById: uuid('replaced_by_id').references(
      (): AnyPgColumn => sessions.id,
      { onDelete: 'set null' },
    ),
  },
  (table) => [
    index('sessions_family').on(table.familyId),
    index('sessions_user').on(table.userId),
  ],
)

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey(),
  userId: owner(),
  tokenHash: text('token_hash').notNull().unique(),
  createdBy: author('created_by'),
  createdAt: createdAt(),
  expiresAt: instant('expires_at').notNull(),
  usedAt: instant('used_at'),
})

export const userPreferences = pgTable(
  'user_preferences',
  {
    userId: owner(),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    updatedAt: instant('updated_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.key] })],
)

export const userConsents = pgTable('user_consents', {
  id: uuid('id').primaryKey(),
  userId: owner(),
  document: consentDocument('document').notNull(),
  version: text('version').notNull(),
  acceptedAt: instant('accepted_at').notNull(),
})

// Quem mudou o quê em ECs, moderação e papéis (auditoria e LGPD)
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey(),
    actorId: author('actor_id'),
    module: text('module').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id').notNull(),
    action: text('action').notNull(),
    changes: jsonb('changes'),
    createdAt: createdAt(),
  },
  (table) => [index('audit_logs_entity').on(table.entity, table.entityId)],
)
