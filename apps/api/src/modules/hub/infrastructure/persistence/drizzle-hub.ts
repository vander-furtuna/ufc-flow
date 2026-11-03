import { Inject, Injectable } from '@nestjs/common'
import { normalizeSearchText } from '@ufc-flow/academic-core'
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  like,
  lt,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'

import { DATABASE, type Database } from '../../../../database/database.module'
import type { Executor } from '../../../../shared/infrastructure/persistence/drizzle-helpers'
import { courses } from '../../../catalog/infrastructure/persistence/catalog.schema'
import { fileAttachmentRepository } from '../../../files/infrastructure/persistence/drizzle-files'
import { users } from '../../../identity/infrastructure/persistence/identity.schema'
import type {
  FeedFilter,
  HubRepositories,
  HubUnitOfWork,
  PostRow,
} from '../../domain/ports'
import type { Post } from '../../domain/post'
import { hubReads, postImages, posts } from './hub.schema'

type PostRecord = typeof posts.$inferSelect

const sortAt = sql`coalesce(${posts.publishedAt}, ${posts.createdAt})`

const searchTextOf = (post: Pick<Post, 'title' | 'summary'>) =>
  normalizeSearchText(`${post.title} ${post.summary ?? ''}`)

// Escapa % e _ do LIKE
const likeTerm = (text: string) => `%${text.replace(/[\\%_]/g, '\\$&')}%`

function toPost(row: PostRecord, imageFileIds: string[]): Post {
  const { searchText: _searchText, ...post } = row
  return { ...post, imageFileIds } as Post
}

async function imagesOf(db: Executor, ids: readonly string[]) {
  if (ids.length === 0) return new Map<string, string[]>()
  const rows = await db
    .select()
    .from(postImages)
    .where(inArray(postImages.postId, [...ids]))
    .orderBy(asc(postImages.position))
  const byPost = new Map<string, string[]>()
  for (const row of rows) {
    byPost.set(row.postId, [...(byPost.get(row.postId) ?? []), row.fileId])
  }
  return byPost
}

// Post do curso, ou institucional quando o filtro permite
function feedWhere(filter: FeedFilter): SQL {
  const conditions: (SQL | undefined)[] = [
    isNull(posts.deletedAt),
    eq(posts.status, filter.status),
    filter.includeInstitutional
      ? or(eq(posts.courseId, filter.courseId), isNull(posts.courseId))
      : eq(posts.courseId, filter.courseId),
    filter.type ? eq(posts.type, filter.type) : undefined,
    filter.q ? like(posts.searchText, likeTerm(filter.q)) : undefined,
    filter.upcoming
      ? and(
          eq(posts.type, 'EVENT'),
          gte(sql`coalesce(${posts.endsAt}, ${posts.startsAt})`, filter.now),
        )
      : undefined,
  ]
  return and(...conditions)!
}

const publishedIn = (courseId: string) =>
  and(
    isNull(posts.deletedAt),
    eq(posts.status, 'PUBLISHED'),
    or(eq(posts.courseId, courseId), isNull(posts.courseId)),
  )

function hubRepositories(db: Executor): HubRepositories {
  const rowsOf = async (records: PostRecord[]): Promise<PostRow[]> => {
    const images = await imagesOf(
      db,
      records.map((record) => record.id),
    )
    const authorIds = [
      ...new Set(
        records
          .map((record) => record.authorId)
          .filter((id): id is string => id !== null),
      ),
    ]
    const names = new Map(
      authorIds.length
        ? (
            await db
              .select({ id: users.id, name: users.name })
              .from(users)
              .where(inArray(users.id, authorIds))
          ).map((user) => [user.id, user.name])
        : [],
    )
    return records.map((record) => ({
      ...toPost(record, images.get(record.id) ?? []),
      authorName: record.authorId ? (names.get(record.authorId) ?? null) : null,
    }))
  }

  return {
    posts: {
      async findById(id) {
        const [row] = await db.select().from(posts).where(eq(posts.id, id))
        if (!row) return null
        return toPost(row, (await imagesOf(db, [id])).get(id) ?? [])
      },
      async findBySlug(courseId, slug) {
        const [row] = await db
          .select()
          .from(posts)
          .where(
            and(
              courseId ? eq(posts.courseId, courseId) : isNull(posts.courseId),
              eq(posts.slug, slug),
            ),
          )
        if (!row) return null
        return toPost(row, (await imagesOf(db, [row.id])).get(row.id) ?? [])
      },
      async slugsLike(courseId, base) {
        const rows = await db
          .select({ slug: posts.slug })
          .from(posts)
          .where(
            and(
              courseId ? eq(posts.courseId, courseId) : isNull(posts.courseId),
              like(posts.slug, `${base.replace(/[\\%_]/g, '\\$&')}%`),
            ),
          )
        return new Set(rows.map((row) => row.slug))
      },
      async save({ imageFileIds, ...post }) {
        const values = { ...post, searchText: searchTextOf(post) }
        const { id: _id, createdAt: _created, ...changes } = values
        await db
          .insert(posts)
          .values(values)
          .onConflictDoUpdate({ target: posts.id, set: changes })
        // A galeria é pequena: regravada inteira
        await db.delete(postImages).where(eq(postImages.postId, post.id))
        if (imageFileIds.length) {
          await db.insert(postImages).values(
            imageFileIds.map((fileId, position) => ({
              postId: post.id,
              fileId,
              position,
            })),
          )
        }
      },
    },
    reader: {
      async pinned(filter) {
        return rowsOf(
          await db
            .select()
            .from(posts)
            .where(and(feedWhere(filter), eq(posts.pinned, true)))
            .orderBy(desc(sortAt), desc(posts.id)),
        )
      },
      async page(filter, after, limit) {
        return rowsOf(
          await db
            .select()
            .from(posts)
            .where(
              and(
                feedWhere(filter),
                // Fixados vêm à parte, só no feed de publicados
                filter.status === 'PUBLISHED'
                  ? eq(posts.pinned, false)
                  : undefined,
                after
                  ? or(
                      lt(sortAt, after.createdAt),
                      and(eq(sortAt, after.createdAt), lt(posts.id, after.id)),
                    )
                  : undefined,
              ),
            )
            .orderBy(desc(sortAt), desc(posts.id))
            .limit(limit + 1),
        )
      },
      async findRow(id) {
        const [row] = await db.select().from(posts).where(eq(posts.id, id))
        return row ? ((await rowsOf([row]))[0] ?? null) : null
      },
      async deadlines(courseId, now, limit) {
        const at = sql`coalesce(${posts.deadlineAt}, ${posts.startsAt})`
        const rows = await db
          .select()
          .from(posts)
          .where(
            and(
              publishedIn(courseId),
              or(
                and(
                  inArray(posts.type, ['SCHOLARSHIP', 'CALL']),
                  gte(posts.deadlineAt, now),
                ),
                and(eq(posts.type, 'EVENT'), gte(posts.startsAt, now)),
              ),
            ),
          )
          .orderBy(asc(at))
          .limit(limit)
        return rows.map((row) => toPost(row, []))
      },
      async unreadCount(courseId, since) {
        const [row] = await db
          .select({ total: count() })
          .from(posts)
          .where(and(publishedIn(courseId), gt(posts.publishedAt, since)))
        return row?.total ?? 0
      },
    },
    reads: {
      async lastSeen(userId, courseId) {
        const [row] = await db
          .select({ at: hubReads.lastSeenAt })
          .from(hubReads)
          .where(
            and(eq(hubReads.userId, userId), eq(hubReads.courseId, courseId)),
          )
        return row?.at ?? null
      },
      async touch(userId, courseId, at) {
        await db
          .insert(hubReads)
          .values({ userId, courseId, lastSeenAt: at })
          .onConflictDoUpdate({
            target: [hubReads.userId, hubReads.courseId],
            set: { lastSeenAt: at },
          })
      },
    },
    courses: {
      async findBySlug(slug) {
        const [row] = await db
          .select({ id: courses.id, isActive: courses.isActive })
          .from(courses)
          .where(eq(courses.slug, slug))
        return row ?? null
      },
    },
    files: fileAttachmentRepository(db),
  }
}

@Injectable()
export class DrizzleHubUnitOfWork implements HubUnitOfWork {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  run<T>(work: (repositories: HubRepositories) => Promise<T>) {
    return this.db.transaction((tx) => work(hubRepositories(tx)))
  }
}
