import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, gt, isNull, lt, or, type SQL } from 'drizzle-orm'

import { DATABASE, type Database } from '../../../../database/database.module'
import {
  mapUnique,
  type Executor,
} from '../../../../shared/infrastructure/persistence/drizzle-helpers'
import { courses } from '../../../catalog/infrastructure/persistence/catalog.schema'
import { fileAttachmentRepository } from '../../../files/infrastructure/persistence/drizzle-files'
import { IdentityErrors } from '../../domain/errors'
import type { ModeratorRequest } from '../../domain/moderator-request'
import type {
  IdentityRepositories,
  IdentityUnitOfWork,
  ModeratorRequestRecord,
} from '../../domain/ports'
import {
  auditLogs,
  courseModerators,
  moderatorRequests,
  passwordResetTokens,
  sessions,
  userConsents,
  userRoles,
  users,
} from './identity.schema'

const requestColumns = {
  id: moderatorRequests.id,
  userId: moderatorRequests.userId,
  courseId: moderatorRequests.courseId,
  justification: moderatorRequests.justification,
  status: moderatorRequests.status,
  reviewedBy: moderatorRequests.reviewedBy,
  reviewedAt: moderatorRequests.reviewedAt,
  reviewNote: moderatorRequests.reviewNote,
  createdAt: moderatorRequests.createdAt,
  userName: users.name,
  userEmail: users.email,
  courseSlug: courses.slug,
  courseName: courses.name,
}

type RequestRow = ModeratorRequest & {
  userName: string
  userEmail: string
  courseSlug: string
  courseName: string
}

const toRecord = (row: RequestRow): ModeratorRequestRecord => ({
  id: row.id,
  userId: row.userId,
  courseId: row.courseId,
  justification: row.justification,
  status: row.status,
  reviewedBy: row.reviewedBy,
  reviewedAt: row.reviewedAt,
  reviewNote: row.reviewNote,
  createdAt: row.createdAt,
  user: { id: row.userId, name: row.userName, email: row.userEmail },
  course: { id: row.courseId, slug: row.courseSlug, name: row.courseName },
})

export function identityRepositories(db: Executor): IdentityRepositories {
  const selectRequests = (where: SQL | undefined) =>
    db
      .select(requestColumns)
      .from(moderatorRequests)
      .innerJoin(users, eq(users.id, moderatorRequests.userId))
      .innerJoin(courses, eq(courses.id, moderatorRequests.courseId))
      .where(where)

  return {
    users: {
      findById: async (id) =>
        (await db.select().from(users).where(eq(users.id, id)))[0] ?? null,
      findByEmail: async (email) =>
        (await db.select().from(users).where(eq(users.email, email)))[0] ??
        null,
      insert: async (user) => {
        await mapUnique(db.insert(users).values(user), {
          users_email_unique: IdentityErrors.emailTaken,
        })
      },
      updatePassword: async (userId, passwordHash, at) => {
        await db
          .update(users)
          .set({ passwordHash, updatedAt: at })
          .where(eq(users.id, userId))
      },
      setAvatar: async (userId, avatarFileId, at) => {
        await db
          .update(users)
          .set({ avatarFileId, updatedAt: at })
          .where(eq(users.id, userId))
      },
      rolesOf: async (userId) =>
        (
          await db
            .select({ role: userRoles.role })
            .from(userRoles)
            .where(eq(userRoles.userId, userId))
        ).map((row) => row.role),
      addRole: async (userId, role, grantedBy, at) => {
        await db
          .insert(userRoles)
          .values({ userId, role, grantedBy, grantedAt: at })
          .onConflictDoNothing()
      },
      insertConsents: async (consents) => {
        await db.insert(userConsents).values(consents)
      },
    },
    sessions: {
      findByTokenHash: async (hash) =>
        (
          await db
            .select()
            .from(sessions)
            .where(eq(sessions.refreshTokenHash, hash))
        )[0] ?? null,
      insert: async (session) => {
        await db.insert(sessions).values(session)
      },
      update: async (session) => {
        await db
          .update(sessions)
          .set({
            revokedAt: session.revokedAt,
            replacedById: session.replacedById,
          })
          .where(eq(sessions.id, session.id))
      },
      revokeFamily: async (familyId, at) => {
        await db
          .update(sessions)
          .set({ revokedAt: at })
          .where(
            and(eq(sessions.familyId, familyId), isNull(sessions.revokedAt)),
          )
      },
      revokeAllOfUser: async (userId, at) => {
        await db
          .update(sessions)
          .set({ revokedAt: at })
          .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
      },
    },
    resetTokens: {
      findByTokenHash: async (hash) =>
        (
          await db
            .select()
            .from(passwordResetTokens)
            .where(eq(passwordResetTokens.tokenHash, hash))
        )[0] ?? null,
      insert: async (token) => {
        await db.insert(passwordResetTokens).values(token)
      },
      update: async (token) => {
        await db
          .update(passwordResetTokens)
          .set({ usedAt: token.usedAt, expiresAt: token.expiresAt })
          .where(eq(passwordResetTokens.id, token.id))
      },
      expireOpenOfUser: async (userId, at) => {
        await db
          .update(passwordResetTokens)
          .set({ expiresAt: at })
          .where(
            and(
              eq(passwordResetTokens.userId, userId),
              isNull(passwordResetTokens.usedAt),
              gt(passwordResetTokens.expiresAt, at),
            ),
          )
      },
    },
    moderation: {
      findRequest: async (id) => {
        const [row] = await selectRequests(eq(moderatorRequests.id, id))
        return row ? toRecord(row) : null
      },
      insertRequest: async (request) => {
        await mapUnique(db.insert(moderatorRequests).values(request), {
          moderator_requests_one_pending:
            IdentityErrors.moderatorRequestPendingExists,
        })
      },
      updateRequest: async (request) => {
        await db
          .update(moderatorRequests)
          .set({
            status: request.status,
            reviewedBy: request.reviewedBy,
            reviewedAt: request.reviewedAt,
            reviewNote: request.reviewNote,
          })
          .where(eq(moderatorRequests.id, request.id))
      },
      hasPendingRequest: async (userId, courseId) =>
        (
          await db
            .select({ id: moderatorRequests.id })
            .from(moderatorRequests)
            .where(
              and(
                eq(moderatorRequests.userId, userId),
                eq(moderatorRequests.courseId, courseId),
                eq(moderatorRequests.status, 'PENDING'),
              ),
            )
            .limit(1)
        ).length > 0,
      listRequests: async ({ status, before, limit }) => {
        const rows = await selectRequests(
          and(
            status ? eq(moderatorRequests.status, status) : undefined,
            before
              ? or(
                  lt(moderatorRequests.createdAt, before.createdAt),
                  and(
                    eq(moderatorRequests.createdAt, before.createdAt),
                    lt(moderatorRequests.id, before.id),
                  ),
                )
              : undefined,
          ),
        )
          .orderBy(
            desc(moderatorRequests.createdAt),
            desc(moderatorRequests.id),
          )
          .limit(limit + 1)
        return rows.map(toRecord)
      },
      listRequestsOfUser: async (userId) =>
        (
          await selectRequests(eq(moderatorRequests.userId, userId)).orderBy(
            desc(moderatorRequests.createdAt),
          )
        ).map(toRecord),
      insertModerator: async (moderator) => {
        await mapUnique(db.insert(courseModerators).values(moderator), {
          course_moderators_one_active: IdentityErrors.moderatorAlreadyActive,
        })
      },
      isActiveModerator: async (userId, courseId) =>
        (
          await db
            .select({ id: courseModerators.id })
            .from(courseModerators)
            .where(
              and(
                eq(courseModerators.userId, userId),
                eq(courseModerators.courseId, courseId),
                isNull(courseModerators.revokedAt),
              ),
            )
            .limit(1)
        ).length > 0,
      moderatedCourses: async (userId) =>
        db
          .select({ id: courses.id, slug: courses.slug, name: courses.name })
          .from(courseModerators)
          .innerJoin(courses, eq(courses.id, courseModerators.courseId))
          .where(
            and(
              eq(courseModerators.userId, userId),
              isNull(courseModerators.revokedAt),
            ),
          )
          .orderBy(courses.name),
    },
    courses: {
      findById: async (id) =>
        (
          await db
            .select({ id: courses.id, slug: courses.slug, name: courses.name })
            .from(courses)
            .where(eq(courses.id, id))
        )[0] ?? null,
    },
    files: fileAttachmentRepository(db),
    audit: {
      record: async (entry) => {
        await db.insert(auditLogs).values(entry)
      },
    },
  }
}

// Cada caso de uso roda numa transação do PostgreSQL
@Injectable()
export class DrizzleIdentityUnitOfWork implements IdentityUnitOfWork {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  run<T>(work: (repositories: IdentityRepositories) => Promise<T>) {
    return this.db.transaction((tx) => work(identityRepositories(tx)))
  }
}
