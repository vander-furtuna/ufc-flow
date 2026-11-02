import type { NotificationType } from '@ufc-flow/contracts'

import type {
  NotificationRecord,
  ScheduleHolder,
} from '../../domain/notification'
import type {
  NotificationRepositories,
  NotificationsUnitOfWork,
} from '../../domain/ports'

const clone = <T>(value: T): T => structuredClone(value)

// Portas em memória, para testar os casos de uso sem banco
export class InMemoryNotifications implements NotificationsUnitOfWork {
  notifications = new Map<string, NotificationRecord>()
  muted = new Map<string, NotificationType[]>()
  admins: string[] = []
  moderators = new Map<string, string[]>()
  names = new Map<string, string>()
  courses = new Map<string, { name: string; slug: string }>()
  terms = new Map<string, string>()
  holders: ScheduleHolder[] = []

  readonly repositories: NotificationRepositories = {
    notifications: {
      findUnreadByGroup: async (userId, groupKey) =>
        clone(
          [...this.notifications.values()].find(
            (item) =>
              item.userId === userId &&
              item.groupKey === groupKey &&
              item.readAt === null,
          ) ?? null,
        ),
      insert: async (notification) => {
        this.notifications.set(notification.id, clone(notification))
      },
      update: async (notification) => {
        this.notifications.set(notification.id, clone(notification))
      },
      list: async (userId, { after, limit, unread }) =>
        [...this.notifications.values()]
          .filter(
            (item) =>
              item.userId === userId &&
              (!unread || item.readAt === null) &&
              (!after ||
                item.updatedAt < after.createdAt ||
                (item.updatedAt.getTime() === after.createdAt.getTime() &&
                  item.id < after.id)),
          )
          .sort(
            (a, b) =>
              b.updatedAt.getTime() - a.updatedAt.getTime() ||
              b.id.localeCompare(a.id),
          )
          .slice(0, limit + 1)
          .map(clone),
      unreadCount: async (userId) =>
        [...this.notifications.values()].filter(
          (item) => item.userId === userId && item.readAt === null,
        ).length,
      markRead: async (userId, ids, now) => {
        for (const item of this.notifications.values()) {
          if (
            item.userId === userId &&
            item.readAt === null &&
            (ids === 'all' || ids.includes(item.id))
          ) {
            item.readAt = now
          }
        }
      },
      deleteReadBefore: async (date) => {
        let count = 0
        for (const [id, item] of this.notifications) {
          if (item.readAt && item.readAt < date) {
            this.notifications.delete(id)
            count++
          }
        }
        return count
      },
    },
    preferences: {
      muted: async (userIds) =>
        new Map(
          userIds.flatMap((id) =>
            this.muted.has(id) ? [[id, new Set(this.muted.get(id))]] : [],
          ),
        ),
      setMuted: async (userId, muted) => {
        this.muted.set(userId, [...muted])
      },
    },
    directory: {
      admins: async () => [...this.admins],
      moderatorsOf: async (courseId) => [
        ...(this.moderators.get(courseId) ?? []),
      ],
      userName: async (userId) => this.names.get(userId) ?? null,
      course: async (courseId) => this.courses.get(courseId) ?? null,
      termCode: async (termId) => this.terms.get(termId) ?? null,
      scheduleHolders: async (sectionIds) =>
        this.holders.filter((holder) => sectionIds.includes(holder.sectionId)),
    },
  }

  run<T>(work: (repositories: NotificationRepositories) => Promise<T>) {
    return work(this.repositories)
  }
}
