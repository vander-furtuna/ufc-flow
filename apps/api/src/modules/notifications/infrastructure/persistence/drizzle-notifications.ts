import type { NotificationType } from '@ufc-flow/contracts'
import { Inject, Injectable } from '@nestjs/common'
import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
} from 'drizzle-orm'

import { DATABASE, type Database } from '../../../../database/database.module'
import type { Executor } from '../../../../shared/infrastructure/persistence/drizzle-helpers'
import {
  courses,
  curricula,
} from '../../../catalog/infrastructure/persistence/catalog.schema'
import {
  academicTerms,
  classSections,
} from '../../../classes/infrastructure/persistence/classes.schema'
import {
  courseModerators,
  userPreferences,
  userRoles,
  users,
} from '../../../identity/infrastructure/persistence/identity.schema'
import {
  scheduleItems,
  schedules,
} from '../../../planning/infrastructure/persistence/planning.schema'
import type { NotificationRecord } from '../../domain/notification'
import type {
  NotificationRepositories,
  NotificationRepository,
  NotificationsUnitOfWork,
  PreferenceStore,
  RecipientDirectory,
} from '../../domain/ports'
import { notifications } from './notifications.schema'

const MUTED_KEY = 'notifications.muted'

type Row = typeof notifications.$inferSelect

const toRecord = (row: Row) => row as unknown as NotificationRecord

function notificationRepository(db: Executor): NotificationRepository {
  return {
    async findUnreadByGroup(userId, groupKey) {
      const [row] = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.groupKey, groupKey),
            isNull(notifications.readAt),
          ),
        )
      return row ? toRecord(row) : null
    },
    async insert(notification) {
      await db.insert(notifications).values(notification)
    },
    async update(notification) {
      await db
        .update(notifications)
        .set(notification)
        .where(eq(notifications.id, notification.id))
    },
    async list(userId, { after, limit, unread }) {
      const rows = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            unread ? isNull(notifications.readAt) : undefined,
            after
              ? or(
                  lt(notifications.updatedAt, after.createdAt),
                  and(
                    eq(notifications.updatedAt, after.createdAt),
                    lt(notifications.id, after.id),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(desc(notifications.updatedAt), desc(notifications.id))
        .limit(limit + 1)
      return rows.map(toRecord)
    },
    async unreadCount(userId) {
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(eq(notifications.userId, userId), isNull(notifications.readAt)),
        )
      return row?.count ?? 0
    },
    async markRead(userId, ids, now) {
      await db
        .update(notifications)
        .set({ readAt: now })
        .where(
          and(
            eq(notifications.userId, userId),
            isNull(notifications.readAt),
            ids === 'all' ? undefined : inArray(notifications.id, [...ids]),
          ),
        )
    },
    async deleteReadBefore(date) {
      const rows = await db
        .delete(notifications)
        .where(
          and(isNotNull(notifications.readAt), lt(notifications.readAt, date)),
        )
        .returning({ id: notifications.id })
      return rows.length
    },
  }
}

function preferenceStore(db: Executor): PreferenceStore {
  return {
    async muted(userIds) {
      if (userIds.length === 0) return new Map()
      const rows = await db
        .select({
          userId: userPreferences.userId,
          value: userPreferences.value,
        })
        .from(userPreferences)
        .where(
          and(
            inArray(userPreferences.userId, [...userIds]),
            eq(userPreferences.key, MUTED_KEY),
          ),
        )
      return new Map(
        rows.map((row) => [
          row.userId,
          new Set(row.value as NotificationType[]),
        ]),
      )
    },
    async setMuted(userId, muted, now) {
      await db
        .insert(userPreferences)
        .values({ userId, key: MUTED_KEY, value: muted, updatedAt: now })
        .onConflictDoUpdate({
          target: [userPreferences.userId, userPreferences.key],
          set: { value: muted, updatedAt: now },
        })
    },
  }
}

function recipientDirectory(db: Executor): RecipientDirectory {
  return {
    async admins() {
      const rows = await db
        .select({ id: users.id })
        .from(userRoles)
        .innerJoin(users, eq(users.id, userRoles.userId))
        .where(and(eq(userRoles.role, 'ADMIN'), eq(users.status, 'ACTIVE')))
      return rows.map((row) => row.id)
    },
    async moderatorsOf(courseId) {
      const rows = await db
        .select({ id: users.id })
        .from(courseModerators)
        .innerJoin(users, eq(users.id, courseModerators.userId))
        .where(
          and(
            eq(courseModerators.courseId, courseId),
            isNull(courseModerators.revokedAt),
            eq(users.status, 'ACTIVE'),
          ),
        )
      return rows.map((row) => row.id)
    },
    async userName(userId) {
      const [row] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, userId))
      return row?.name ?? null
    },
    async course(courseId) {
      const [row] = await db
        .select({ name: courses.name, slug: courses.slug })
        .from(courses)
        .where(eq(courses.id, courseId))
      return row ?? null
    },
    async termCode(termId) {
      const [row] = await db
        .select({ code: academicTerms.code })
        .from(academicTerms)
        .where(eq(academicTerms.id, termId))
      return row?.code ?? null
    },
    async scheduleHolders(sectionIds) {
      if (sectionIds.length === 0) return []
      return db
        .select({
          userId: schedules.userId,
          sectionId: classSections.id,
          subjectCode: classSections.subjectCode,
          subjectName: classSections.subjectName,
          sectionCode: classSections.sectionCode,
          term: academicTerms.code,
          courseId: courses.id,
          courseSlug: courses.slug,
          curriculumSlug: curricula.slug,
          scheduleName: schedules.name,
        })
        .from(scheduleItems)
        .innerJoin(schedules, eq(schedules.id, scheduleItems.scheduleId))
        .innerJoin(
          classSections,
          eq(classSections.id, scheduleItems.classSectionId),
        )
        .innerJoin(academicTerms, eq(academicTerms.id, classSections.termId))
        .innerJoin(courses, eq(courses.id, schedules.courseId))
        .innerJoin(curricula, eq(curricula.id, schedules.curriculumId))
        .where(inArray(scheduleItems.classSectionId, [...sectionIds]))
        .orderBy(schedules.userId, schedules.position, schedules.createdAt)
    },
  }
}

export function notificationRepositories(
  db: Executor,
): NotificationRepositories {
  return {
    notifications: notificationRepository(db),
    preferences: preferenceStore(db),
    directory: recipientDirectory(db),
  }
}

@Injectable()
export class DrizzleNotificationsUnitOfWork implements NotificationsUnitOfWork {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  run<T>(work: (repositories: NotificationRepositories) => Promise<T>) {
    return this.db.transaction((tx) => work(notificationRepositories(tx)))
  }
}
