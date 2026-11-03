import { postStatusSchema, postTypeSchema } from '@ufc-flow/contracts'
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
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { courses } from '../../../catalog/infrastructure/persistence/catalog.schema'
import { files } from '../../../files/infrastructure/persistence/files.schema'
import { users } from '../../../identity/infrastructure/persistence/identity.schema'

const values = <T extends string>(options: readonly T[]) =>
  options as unknown as [T, ...T[]]

export const postType = pgEnum('post_type', values(postTypeSchema.options))
export const postStatus = pgEnum(
  'post_status',
  values(postStatusSchema.options),
)

const instant = (name: string) => timestamp(name, { withTimezone: true })

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey(),
    // Nulo: post institucional, no hub de todos os cursos
    courseId: uuid('course_id').references(() => courses.id, {
      onDelete: 'cascade',
    }),
    // Autoria: some com a conta (LGPD), o post fica
    authorId: uuid('author_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    type: postType('type').notNull(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    summary: text('summary'),
    bodyMd: text('body_md').notNull(),
    coverFileId: uuid('cover_file_id').references(() => files.id, {
      onDelete: 'set null',
    }),
    externalUrl: text('external_url'),
    status: postStatus('status').notNull(),
    pinned: boolean('pinned').notNull().default(false),
    publishedAt: instant('published_at'),
    startsAt: instant('starts_at'),
    endsAt: instant('ends_at'),
    deadlineAt: instant('deadline_at'),
    location: text('location'),
    attributes: jsonb('attributes')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    // Título e resumo sem acentos e em minúsculas, para a busca do hub
    searchText: text('search_text').notNull(),
    createdAt: instant('created_at').notNull(),
    updatedAt: instant('updated_at').notNull(),
    deletedAt: instant('deleted_at'),
  },
  (table) => [
    uniqueIndex('posts_course_slug')
      .on(table.courseId, table.slug)
      .where(sql`${table.courseId} IS NOT NULL`),
    uniqueIndex('posts_institutional_slug')
      .on(table.slug)
      .where(sql`${table.courseId} IS NULL`),
    index('posts_feed').on(
      table.courseId,
      table.status,
      sql`coalesce(${table.publishedAt}, ${table.createdAt}) DESC`,
    ),
    index('posts_search_text_trgm').using(
      'gin',
      sql`${table.searchText} gin_trgm_ops`,
    ),
    check(
      'posts_ends_after_start',
      sql`${table.endsAt} IS NULL OR ${table.startsAt} IS NULL OR ${table.endsAt} >= ${table.startsAt}`,
    ),
  ],
)

export const postImages = pgTable(
  'post_images',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    fileId: uuid('file_id')
      .notNull()
      .references(() => files.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.fileId] })],
)

// Última visita ao hub do curso, para o badge de novidades (D74)
export const hubReads = pgTable(
  'hub_reads',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    lastSeenAt: instant('last_seen_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.courseId] })],
)
