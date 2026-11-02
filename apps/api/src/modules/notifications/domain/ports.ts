import type { NotificationType } from '@ufc-flow/contracts'

import type { CursorPosition } from '../../../shared/domain/cursor'
import type { NotificationRecord, ScheduleHolder } from './notification'

export interface NotificationRepository {
  findUnreadByGroup(
    userId: string,
    groupKey: string,
  ): Promise<NotificationRecord | null>
  insert(notification: NotificationRecord): Promise<void>
  update(notification: NotificationRecord): Promise<void>
  // Da atualizada mais recentemente para a mais antiga; pede limit + 1
  list(
    userId: string,
    options: { after: CursorPosition | null; limit: number; unread: boolean },
  ): Promise<NotificationRecord[]>
  unreadCount(userId: string): Promise<number>
  markRead(
    userId: string,
    ids: readonly string[] | 'all',
    now: Date,
  ): Promise<void>
  deleteReadBefore(date: Date): Promise<number>
}

export interface PreferenceStore {
  muted(userIds: readonly string[]): Promise<Map<string, Set<NotificationType>>>
  setMuted(
    userId: string,
    muted: readonly NotificationType[],
    now: Date,
  ): Promise<void>
}

// Quem recebe e os nomes que vão nos dados
export interface RecipientDirectory {
  admins(): Promise<string[]>
  moderatorsOf(courseId: string): Promise<string[]>
  userName(userId: string): Promise<string | null>
  course(courseId: string): Promise<{ name: string; slug: string } | null>
  termCode(termId: string): Promise<string | null>
  scheduleHolders(sectionIds: readonly string[]): Promise<ScheduleHolder[]>
}

export type NotificationRepositories = {
  notifications: NotificationRepository
  preferences: PreferenceStore
  directory: RecipientDirectory
}

export interface NotificationsUnitOfWork {
  run<T>(
    work: (repositories: NotificationRepositories) => Promise<T>,
  ): Promise<T>
}

export const NOTIFICATIONS_UOW = Symbol('NotificationsUnitOfWork')

// Notificações lidas somem depois disso (job diário)
export const RETENTION_DAYS = 90
