import { Inject, Injectable } from '@nestjs/common'
import type {
  MessageMention,
  MessageStatus,
  ReportQueueItem,
  RestrictionView,
  SubjectSearchResult,
} from '@ufc-flow/contracts'
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
  type AnyColumn,
  type SQL,
} from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { DATABASE, type Database } from '../../../../database/database.module'
import type { CursorPosition } from '../../../../shared/domain/cursor'
import type { Executor } from '../../../../shared/infrastructure/persistence/drizzle-helpers'
import {
  courses,
  curricula,
  curriculumSubjects,
  subjects,
} from '../../../catalog/infrastructure/persistence/catalog.schema'
import {
  courseModerators,
  moderatorRequests,
  userRoles,
  users,
} from '../../../identity/infrastructure/persistence/identity.schema'
import type { Message, Viewer } from '../../domain/message'
import type {
  CourseScope,
  ForumRepositories,
  ForumUnitOfWork,
  MessageRow,
} from '../../domain/ports'
import {
  messageLikes,
  messageReports,
  messageSubjectMentions,
  messages,
  moderationActions,
  userCourseRestrictions,
} from './forum.schema'

type MessageRecord = typeof messages.$inferSelect

const toMessage = (record: MessageRecord): Message => record as Message

const parents = alias(messages, 'parents')
const authors = alias(users, 'authors')
const parentAuthors = alias(users, 'parent_authors')

// Depois do cursor, na ordem decrescente (timeline) ou crescente (respostas)
const beforeCursor = (after: CursorPosition | null) =>
  after
    ? or(
        lt(messages.createdAt, after.createdAt),
        and(eq(messages.createdAt, after.createdAt), lt(messages.id, after.id)),
      )
    : undefined
const afterCursor = (after: CursorPosition | null) =>
  after
    ? or(
        gt(messages.createdAt, after.createdAt),
        and(eq(messages.createdAt, after.createdAt), gt(messages.id, after.id)),
      )
    : undefined

// O leitor pode ver a oculta (é o autor ou modera)?
const seesHidden = (viewer: Viewer): SQL =>
  viewer.canModerate
    ? sql`true`
    : viewer.userId
      ? eq(messages.authorId, viewer.userId)
      : sql`false`

function forumRepositories(db: Executor): ForumRepositories {
  async function hydrate(
    records: readonly { id: string }[],
    viewerId: string | null,
  ): Promise<MessageRow[]> {
    const ids = records.map((record) => record.id)
    if (ids.length === 0) return []
    const rows = await db
      .select({
        message: messages,
        authorName: authors.name,
        authorAvatarFileId: authors.avatarFileId,
        parentAuthorName: parentAuthors.name,
      })
      .from(messages)
      .leftJoin(authors, eq(authors.id, messages.authorId))
      .leftJoin(parents, eq(parents.id, messages.parentId))
      .leftJoin(parentAuthors, eq(parentAuthors.id, parents.authorId))
      .where(inArray(messages.id, ids))
    const liked = viewerId
      ? new Set(
          (
            await db
              .select({ id: messageLikes.messageId })
              .from(messageLikes)
              .where(
                and(
                  inArray(messageLikes.messageId, ids),
                  eq(messageLikes.userId, viewerId),
                ),
              )
          ).map((row) => row.id),
        )
      : new Set<string>()
    const mentions = new Map<string, MessageMention[]>()
    for (const row of await db
      .select({
        messageId: messageSubjectMentions.messageId,
        code: subjects.code,
        name: subjects.name,
        slug: subjects.slug,
      })
      .from(messageSubjectMentions)
      .innerJoin(subjects, eq(subjects.id, messageSubjectMentions.subjectId))
      .where(inArray(messageSubjectMentions.messageId, ids))
      .orderBy(asc(subjects.code))) {
      const { messageId, ...mention } = row
      mentions.set(messageId, [...(mentions.get(messageId) ?? []), mention])
    }
    const byId = new Map(
      rows.map((row) => [
        row.message.id,
        {
          ...toMessage(row.message),
          authorName: row.authorName,
          authorAvatarFileId: row.authorAvatarFileId,
          parentAuthorName: row.parentAuthorName,
          likedByMe: liked.has(row.message.id),
          mentions: mentions.get(row.message.id) ?? [],
        } satisfies MessageRow,
      ]),
    )
    // Na ordem pedida
    return ids.flatMap((id) => {
      const row = byId.get(id)
      return row ? [row] : []
    })
  }

  return {
    messages: {
      async findById(id) {
        const [row] = await db
          .select()
          .from(messages)
          .where(eq(messages.id, id))
        return row ? toMessage(row) : null
      },
      async save(message, mentionSubjectIds) {
        await db
          .insert(messages)
          .values(message)
          .onConflictDoUpdate({
            target: messages.id,
            set: {
              content: message.content,
              status: message.status,
              editedAt: message.editedAt,
              removedAt: message.removedAt,
              removedBy: message.removedBy,
              removalReason: message.removalReason,
            },
          })
        await db
          .delete(messageSubjectMentions)
          .where(eq(messageSubjectMentions.messageId, message.id))
        if (mentionSubjectIds.length > 0) {
          await db.insert(messageSubjectMentions).values(
            mentionSubjectIds.map((subjectId) => ({
              messageId: message.id,
              subjectId,
            })),
          )
        }
      },
      async delete(id) {
        await db.delete(messages).where(eq(messages.id, id))
      },
      async addReplies(id, delta) {
        await db
          .update(messages)
          .set({ replyCount: sql`${messages.replyCount} + ${delta}` })
          .where(eq(messages.id, id))
      },
      async addLikes(id, delta) {
        const [row] = await db
          .update(messages)
          .set({ likeCount: sql`${messages.likeCount} + ${delta}` })
          .where(eq(messages.id, id))
          .returning({ likeCount: messages.likeCount })
        return row?.likeCount ?? 0
      },
      async countByAuthorSince(authorId, since) {
        const [row] = await db
          .select({ total: count() })
          .from(messages)
          .where(
            and(
              eq(messages.authorId, authorId),
              gte(messages.createdAt, since),
            ),
          )
        return row?.total ?? 0
      },
    },
    likes: {
      async add(messageId, userId, at) {
        const rows = await db
          .insert(messageLikes)
          .values({ messageId, userId, createdAt: at })
          .onConflictDoNothing()
          .returning({ id: messageLikes.messageId })
        return rows.length > 0
      },
      async remove(messageId, userId) {
        const rows = await db
          .delete(messageLikes)
          .where(
            and(
              eq(messageLikes.messageId, messageId),
              eq(messageLikes.userId, userId),
            ),
          )
          .returning({ id: messageLikes.messageId })
        return rows.length > 0
      },
    },
    reader: {
      rows: (ids, viewerId) =>
        hydrate(
          ids.map((id) => ({ id })),
          viewerId,
        ),
      async timeline(courseId, viewer, after, limit) {
        const records = await db
          .select({ id: messages.id })
          .from(messages)
          .where(
            and(
              eq(messages.courseId, courseId),
              isNull(messages.parentId),
              // As visíveis, as tiradas do ar com respostas (viram aviso) e as
              // ocultas que o leitor pode ver
              or(
                eq(messages.status, 'VISIBLE'),
                gt(messages.replyCount, 0),
                and(eq(messages.status, 'HIDDEN'), seesHidden(viewer)),
              ),
              beforeCursor(after),
            ),
          )
          .orderBy(desc(messages.createdAt), desc(messages.id))
          .limit(limit + 1)
        return hydrate(records, viewer.userId)
      },
      async countNewRoots(courseId, since, viewerId) {
        const [row] = await db
          .select({ total: count() })
          .from(messages)
          .where(
            and(
              eq(messages.courseId, courseId),
              isNull(messages.parentId),
              eq(messages.status, 'VISIBLE'),
              gt(messages.createdAt, since),
              viewerId
                ? or(isNull(messages.authorId), ne(messages.authorId, viewerId))
                : undefined,
            ),
          )
        return row?.total ?? 0
      },
      async replies(parentId, viewer, after, limit) {
        const records = await db
          .select({ id: messages.id })
          .from(messages)
          .where(
            and(
              eq(messages.parentId, parentId),
              or(
                ne(messages.status, 'HIDDEN'),
                gt(messages.replyCount, 0),
                seesHidden(viewer),
              ),
              afterCursor(after),
            ),
          )
          .orderBy(asc(messages.createdAt), asc(messages.id))
          .limit(limit + 1)
        return hydrate(records, viewer.userId)
      },
      async bySubject(courseId, subjectId, viewerId, after, limit) {
        const records = await db
          .select({ id: messages.id })
          .from(messages)
          .innerJoin(
            messageSubjectMentions,
            eq(messageSubjectMentions.messageId, messages.id),
          )
          .where(
            and(
              eq(messages.courseId, courseId),
              eq(messageSubjectMentions.subjectId, subjectId),
              eq(messages.status, 'VISIBLE'),
              beforeCursor(after),
            ),
          )
          .orderBy(desc(messages.createdAt), desc(messages.id))
          .limit(limit + 1)
        return hydrate(records, viewerId)
      },
      async threadAuthors(rootId) {
        const rows = await db
          .selectDistinct({ authorId: messages.authorId })
          .from(messages)
          .where(
            and(
              or(eq(messages.id, rootId), eq(messages.rootId, rootId)),
              isNotNull(messages.authorId),
            ),
          )
        return rows.map((row) => row.authorId!)
      },
      async trendingSubjects(courseId, since, limit) {
        const total = count()
        const rows = await db
          .select({
            code: subjects.code,
            name: subjects.name,
            slug: subjects.slug,
            count: total,
          })
          .from(messageSubjectMentions)
          .innerJoin(
            messages,
            eq(messages.id, messageSubjectMentions.messageId),
          )
          .innerJoin(
            subjects,
            eq(subjects.id, messageSubjectMentions.subjectId),
          )
          .where(
            and(
              eq(messages.courseId, courseId),
              eq(messages.status, 'VISIBLE'),
              gte(messages.createdAt, since),
            ),
          )
          .groupBy(subjects.id)
          .orderBy(desc(total), asc(subjects.code))
          .limit(limit)
        return rows
      },
    },
    catalog: {
      async course(slug) {
        const [row] = await db
          .select({
            id: courses.id,
            slug: courses.slug,
            name: courses.name,
            isActive: courses.isActive,
          })
          .from(courses)
          .where(eq(courses.slug, slug))
        return row ?? null
      },
      async courseById(id) {
        const [row] = await db
          .select({
            id: courses.id,
            slug: courses.slug,
            name: courses.name,
            isActive: courses.isActive,
          })
          .from(courses)
          .where(eq(courses.id, id))
        return row ?? null
      },
      async subjectsByCode(codes) {
        if (codes.length === 0) return []
        return db
          .select({ id: subjects.id, code: subjects.code })
          .from(subjects)
          .where(inArray(subjects.code, [...codes]))
      },
      async subjectByCode(code) {
        const [row] = await db
          .select({ id: subjects.id })
          .from(subjects)
          .where(eq(subjects.code, code))
        return row ?? null
      },
      async searchSubjects(courseId, query, limit) {
        // A EC vigente do curso; fora dela, um curso com EC publicada que tem
        // a disciplina (as de ECs só em rascunho ficam de fora)
        const term = query.replace(/[\\%_]/g, '\\$&')
        const result = await db.execute<{
          code: string
          name: string
          slug: string
          semester: number | null
          nature: SubjectSearchResult['nature']
          course_name: string | null
          in_curriculum: boolean
        }>(sql`
          SELECT s.code, s.name, s.slug, cs.semester, cs.nature,
            cs.id IS NOT NULL AS in_curriculum,
            (SELECT c.name FROM ${curriculumSubjects} other
              JOIN ${curricula} cu ON cu.id = other.curriculum_id
              JOIN ${courses} c ON c.id = cu.course_id
              WHERE other.subject_id = s.id AND cu.status = 'PUBLISHED'
              ORDER BY c.name LIMIT 1) AS course_name
          FROM ${subjects} s
          LEFT JOIN ${curriculumSubjects} cs ON cs.subject_id = s.id
            AND cs.curriculum_id = (
              SELECT id FROM ${curricula}
              WHERE course_id = ${courseId} AND is_current LIMIT 1)
          WHERE s.search_name LIKE ${`%${term}%`}
            OR s.code LIKE ${`${term.toUpperCase()}%`}
          ORDER BY (cs.id IS NULL), s.name
          LIMIT ${limit * 3}
        `)
        return result.rows
          .filter((row) => row.in_curriculum || row.course_name !== null)
          .slice(0, limit)
          .map((row) => ({
            code: row.code,
            name: row.name,
            slug: row.slug,
            inCurriculum: row.in_curriculum,
            semester: row.in_curriculum ? row.semester : null,
            nature: row.in_curriculum ? row.nature : null,
            courseName: row.in_curriculum ? null : row.course_name,
          }))
      },
    },
    reports: {
      async insert(report) {
        const rows = await db
          .insert(messageReports)
          .values(report)
          .onConflictDoNothing()
          .returning({ id: messageReports.id })
        return rows.length > 0
      },
      async openReporters(messageId) {
        const [row] = await db
          .select({
            total: sql<number>`count(distinct ${messageReports.reporterId})::int`,
          })
          .from(messageReports)
          .where(
            and(
              eq(messageReports.messageId, messageId),
              eq(messageReports.status, 'OPEN'),
            ),
          )
        return row?.total ?? 0
      },
      async resolveOpen(messageId, status, by, at) {
        const rows = await db
          .update(messageReports)
          .set({ status, resolvedBy: by, resolvedAt: at })
          .where(
            and(
              eq(messageReports.messageId, messageId),
              eq(messageReports.status, 'OPEN'),
            ),
          )
          .returning({ id: messageReports.id })
        return rows.length
      },
    },
    moderationLog: {
      async record(entry) {
        await db.insert(moderationActions).values(entry)
      },
    },
    restrictions: {
      async active(userId, courseId, now) {
        const [row] = await db
          .select()
          .from(userCourseRestrictions)
          .where(
            and(
              eq(userCourseRestrictions.userId, userId),
              eq(userCourseRestrictions.courseId, courseId),
              activeAt(now),
            ),
          )
          .orderBy(desc(userCourseRestrictions.createdAt))
          .limit(1)
        return row ?? null
      },
      async findById(id) {
        const [row] = await db
          .select()
          .from(userCourseRestrictions)
          .where(eq(userCourseRestrictions.id, id))
        return row ?? null
      },
      async save(restriction) {
        await db
          .insert(userCourseRestrictions)
          .values(restriction)
          .onConflictDoUpdate({
            target: userCourseRestrictions.id,
            set: { liftedAt: restriction.liftedAt },
          })
      },
    },
    moderation: {
      async queue(scope, limit) {
        const rows = await db
          .select({
            report: messageReports,
            message: messages,
            authorName: authors.name,
            course: { id: courses.id, slug: courses.slug, name: courses.name },
          })
          .from(messageReports)
          .innerJoin(messages, eq(messages.id, messageReports.messageId))
          .innerJoin(courses, eq(courses.id, messages.courseId))
          .leftJoin(authors, eq(authors.id, messages.authorId))
          .where(
            and(
              eq(messageReports.status, 'OPEN'),
              inScope(messages.courseId, scope),
            ),
          )
          .orderBy(asc(messageReports.createdAt))
        const messageIds = [...new Set(rows.map((row) => row.message.id))]
        // Oculta à mão (HIDE_MESSAGE) não conta como automática
        const hiddenByHand = new Set(
          messageIds.length === 0
            ? []
            : (
                await db
                  .select({ id: moderationActions.targetMessageId })
                  .from(moderationActions)
                  .where(
                    and(
                      eq(moderationActions.action, 'HIDE_MESSAGE'),
                      inArray(moderationActions.targetMessageId, messageIds),
                    ),
                  )
              ).map((row) => row.id),
        )
        const items = new Map<string, ReportQueueItem>()
        for (const { report, message, authorName, course } of rows) {
          const item: ReportQueueItem = items.get(message.id) ?? {
            messageId: message.id,
            rootId: message.rootId ?? message.id,
            course,
            author:
              message.authorId && authorName
                ? { id: message.authorId, name: authorName }
                : null,
            snapshot: report.contentSnapshot,
            status: message.status as MessageStatus,
            autoHidden:
              message.status === 'HIDDEN' && !hiddenByHand.has(message.id),
            reasons: [],
            details: [],
            reportCount: 0,
            firstReportedAt: report.createdAt.toISOString(),
          }
          const reason = item.reasons.find(
            (entry) => entry.reason === report.reason,
          )
          if (reason) reason.count++
          else item.reasons.push({ reason: report.reason, count: 1 })
          if (report.details) item.details.push(report.details)
          item.reportCount++
          items.set(message.id, item)
        }
        // As ocultas sozinhas primeiro, depois as mais denunciadas
        return [...items.values()]
          .sort(
            (a, b) =>
              Number(b.autoHidden) - Number(a.autoHidden) ||
              b.reportCount - a.reportCount ||
              a.firstReportedAt.localeCompare(b.firstReportedAt),
          )
          .slice(0, limit)
      },
      activeRestrictions: (scope, now) =>
        restrictionViews(
          and(activeAt(now), inScope(userCourseRestrictions.courseId, scope))!,
        ),
      async restrictionView(id) {
        const [view] = await restrictionViews(eq(userCourseRestrictions.id, id))
        return view ?? null
      },
      async openReportCount(scope) {
        const [row] = await db
          .select({
            total: sql<number>`count(distinct ${messageReports.messageId})::int`,
          })
          .from(messageReports)
          .innerJoin(messages, eq(messages.id, messageReports.messageId))
          .where(
            and(
              eq(messageReports.status, 'OPEN'),
              inScope(messages.courseId, scope),
            ),
          )
        return row?.total ?? 0
      },
      async pendingModeratorRequests() {
        const [row] = await db
          .select({ total: count() })
          .from(moderatorRequests)
          .where(eq(moderatorRequests.status, 'PENDING'))
        return row?.total ?? 0
      },
      async target(userId, courseId) {
        const [user] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, userId))
        if (!user) return null
        const [admin] = await db
          .select({ role: userRoles.role })
          .from(userRoles)
          .where(and(eq(userRoles.userId, userId), eq(userRoles.role, 'ADMIN')))
        const [moderator] = await db
          .select({ id: courseModerators.id })
          .from(courseModerators)
          .where(
            and(
              eq(courseModerators.userId, userId),
              eq(courseModerators.courseId, courseId),
              isNull(courseModerators.revokedAt),
            ),
          )
        return {
          userId,
          isAdmin: Boolean(admin),
          moderatesCourse: Boolean(moderator),
        }
      },
    },
  }

  async function restrictionViews(where: SQL): Promise<RestrictionView[]> {
    const rows = await db
      .select({
        restriction: userCourseRestrictions,
        userName: users.name,
        creatorName: creators.name,
        course: { id: courses.id, slug: courses.slug, name: courses.name },
      })
      .from(userCourseRestrictions)
      .innerJoin(users, eq(users.id, userCourseRestrictions.userId))
      .innerJoin(courses, eq(courses.id, userCourseRestrictions.courseId))
      .leftJoin(creators, eq(creators.id, userCourseRestrictions.createdBy))
      .where(where)
      .orderBy(desc(userCourseRestrictions.createdAt))
    return rows.map(({ restriction, userName, creatorName, course }) => ({
      id: restriction.id,
      user: { id: restriction.userId, name: userName },
      course,
      type: restriction.type,
      reason: restriction.reason,
      createdBy:
        restriction.createdBy && creatorName
          ? { id: restriction.createdBy, name: creatorName }
          : null,
      createdAt: restriction.createdAt.toISOString(),
      expiresAt: restriction.expiresAt?.toISOString() ?? null,
    }))
  }
}

const creators = alias(users, 'creators')

// Restrição em vigor: não suspensa e dentro do prazo
const activeAt = (now: Date) =>
  and(
    isNull(userCourseRestrictions.liftedAt),
    or(
      isNull(userCourseRestrictions.expiresAt),
      gt(userCourseRestrictions.expiresAt, now),
    ),
  )

const inScope = (column: AnyColumn, scope: CourseScope) =>
  scope === 'ALL' ? undefined : inArray(column, [...scope])

@Injectable()
export class DrizzleForumUnitOfWork implements ForumUnitOfWork {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  run<T>(work: (repositories: ForumRepositories) => Promise<T>) {
    return this.db.transaction((tx) => work(forumRepositories(tx)))
  }
}
