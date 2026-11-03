import {
  internalTargetSchema,
  linkBadgeSchema,
  linkButtonShapeSchema,
  linkButtonStyleSchema,
  linkKindSchema,
  linkPageThemeSchema,
  linkTitleFontSchema,
  linkTrafficSourceSchema,
  socialNetworkSchema,
} from '@ufc-flow/contracts'
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
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { courses } from '../../../catalog/infrastructure/persistence/catalog.schema'
import { files } from '../../../files/infrastructure/persistence/files.schema'
import { posts } from '../../../hub/infrastructure/persistence/hub.schema'
import { users } from '../../../identity/infrastructure/persistence/identity.schema'

const values = <T extends string>(options: readonly T[]) =>
  options as unknown as [T, ...T[]]

export const linkKind = pgEnum('link_kind', values(linkKindSchema.options))
export const linkBadge = pgEnum('link_badge', values(linkBadgeSchema.options))
export const linkInternalTarget = pgEnum(
  'link_internal_target',
  values(internalTargetSchema.options),
)
export const linkPageTheme = pgEnum(
  'link_page_theme',
  values(linkPageThemeSchema.options),
)
export const linkButtonStyle = pgEnum(
  'link_button_style',
  values(linkButtonStyleSchema.options),
)
export const linkButtonShape = pgEnum(
  'link_button_shape',
  values(linkButtonShapeSchema.options),
)
export const linkTitleFont = pgEnum(
  'link_title_font',
  values(linkTitleFontSchema.options),
)
export const socialNetwork = pgEnum(
  'social_network',
  values(socialNetworkSchema.options),
)
export const linkTrafficSource = pgEnum(
  'link_traffic_source',
  values(linkTrafficSourceSchema.options),
)

const instant = (name: string) => timestamp(name, { withTimezone: true })
const day = (name: string) => date(name, { mode: 'string' })
const author = (name: string) =>
  uuid(name).references(() => users.id, { onDelete: 'set null' })

export const courseLinkPages = pgTable('course_link_pages', {
  courseId: uuid('course_id')
    .primaryKey()
    .references(() => courses.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  bio: text('bio'),
  avatarFileId: uuid('avatar_file_id').references(() => files.id, {
    onDelete: 'set null',
  }),
  avatarIcon: text('avatar_icon'),
  coverFileId: uuid('cover_file_id').references(() => files.id, {
    onDelete: 'set null',
  }),
  theme: linkPageTheme('theme').notNull(),
  buttonStyle: linkButtonStyle('button_style').notNull(),
  buttonShape: linkButtonShape('button_shape').notNull(),
  titleFont: linkTitleFont('title_font').notNull(),
  isPublished: boolean('is_published').notNull().default(false),
  updatedBy: author('updated_by'),
  updatedAt: instant('updated_at').notNull(),
})

export const courseLinkSections = pgTable(
  'course_link_sections',
  {
    id: uuid('id').primaryKey(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    position: integer('position').notNull(),
    isVisible: boolean('is_visible').notNull().default(true),
  },
  (table) => [index('course_link_sections_course').on(table.courseId)],
)

export const courseLinks = pgTable(
  'course_links',
  {
    id: uuid('id').primaryKey(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    // Seção removida: o link vai para o topo
    sectionId: uuid('section_id').references(() => courseLinkSections.id, {
      onDelete: 'set null',
    }),
    kind: linkKind('kind').notNull(),
    label: text('label').notNull(),
    description: text('description'),
    url: text('url'),
    // O alvo some com o link (o CHECK exige um alvo)
    fileId: uuid('file_id').references(() => files.id, { onDelete: 'cascade' }),
    internalTarget: linkInternalTarget('internal_target'),
    postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }),
    icon: text('icon'),
    thumbnailFileId: uuid('thumbnail_file_id').references(() => files.id, {
      onDelete: 'set null',
    }),
    isFeatured: boolean('is_featured').notNull().default(false),
    badge: linkBadge('badge').notNull().default('NONE'),
    openInSameTab: boolean('open_in_same_tab').notNull().default(false),
    visibleFrom: instant('visible_from'),
    visibleUntil: instant('visible_until'),
    isVisible: boolean('is_visible').notNull().default(true),
    position: integer('position').notNull(),
    createdBy: author('created_by'),
    createdAt: instant('created_at').notNull(),
    updatedAt: instant('updated_at').notNull(),
  },
  (table) => [
    index('course_links_course').on(table.courseId),
    // No máximo um destaque por página
    uniqueIndex('course_links_one_featured')
      .on(table.courseId)
      .where(sql`${table.isFeatured}`),
    check(
      'course_links_one_target',
      sql`(${table.kind} = 'URL') = (${table.url} IS NOT NULL)
        AND (${table.kind} = 'FILE') = (${table.fileId} IS NOT NULL)
        AND (${table.kind} = 'INTERNAL') = (${table.internalTarget} IS NOT NULL)
        AND (${table.kind} = 'POST') = (${table.postId} IS NOT NULL)`,
    ),
    check(
      'course_links_period',
      sql`${table.visibleUntil} IS NULL OR ${table.visibleFrom} IS NULL OR ${table.visibleUntil} > ${table.visibleFrom}`,
    ),
  ],
)

export const courseSocialLinks = pgTable(
  'course_social_links',
  {
    id: uuid('id').primaryKey(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    network: socialNetwork('network').notNull(),
    url: text('url').notNull(),
    position: integer('position').notNull(),
  },
  (table) => [index('course_social_links_course').on(table.courseId)],
)

// Contagens anônimas: sem usuário nem IP
export const linkClicksDaily = pgTable(
  'link_clicks_daily',
  {
    linkId: uuid('link_id')
      .notNull()
      .references(() => courseLinks.id, { onDelete: 'cascade' }),
    day: day('day').notNull(),
    source: linkTrafficSource('source').notNull(),
    clicks: integer('clicks').notNull(),
  },
  (table) => [primaryKey({ columns: [table.linkId, table.day, table.source] })],
)

export const linkPageViewsDaily = pgTable(
  'link_page_views_daily',
  {
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    day: day('day').notNull(),
    source: linkTrafficSource('source').notNull(),
    views: integer('views').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.courseId, table.day, table.source] }),
  ],
)
