import { Inject, Injectable } from '@nestjs/common'
import type {
  MarkNotificationsReadInput,
  NotificationListQuery,
  NotificationPage,
  NotificationPreferences,
  NotificationView,
  UnreadCount,
} from '@ufc-flow/contracts'

import { CLOCK, type Clock } from '../../../shared/domain/clock'
import { decodeCursor, pageOf } from '../../../shared/domain/cursor'
import type { DomainEvent } from '../../../shared/domain/events'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import {
  mergeNotification,
  sectionNotifications,
  selectRecipients,
  type NotificationDraft,
  type NotificationRecord,
} from '../domain/notification'
import {
  NOTIFICATIONS_UOW,
  RETENTION_DAYS,
  type NotificationsUnitOfWork,
} from '../domain/ports'

const DAY = 24 * 60 * 60 * 1000

export const toNotificationView = (
  record: NotificationRecord,
): NotificationView =>
  ({
    id: record.id,
    type: record.type,
    data: record.data,
    readAt: record.readAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }) as NotificationView

// Grava as notificações: sem o autor da ação nem tipos silenciados, e as
// não lidas de mesma chave viram uma só
@Injectable()
export class NotificationDispatcher {
  constructor(
    @Inject(NOTIFICATIONS_UOW) private readonly uow: NotificationsUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  deliver(
    drafts: readonly NotificationDraft[],
    actorId: string | null,
  ): Promise<number> {
    if (drafts.length === 0) return Promise.resolve(0)
    return this.uow.run(async ({ notifications, preferences }) => {
      const muted = await preferences.muted([
        ...new Set(drafts.map((draft) => draft.userId)),
      ])
      const recipients = selectRecipients(drafts, { actorId, muted })
      const now = this.clock.now()
      for (const draft of recipients) {
        const existing = draft.groupKey
          ? await notifications.findUnreadByGroup(draft.userId, draft.groupKey)
          : null
        if (existing) {
          await notifications.update(mergeNotification(existing, draft, now))
        } else {
          await notifications.insert({
            ...draft,
            id: this.ids.next(),
            readAt: null,
            createdAt: now,
            updatedAt: now,
          } as NotificationRecord)
        }
      }
      return recipients.length
    })
  }
}

// Traduz cada evento de domínio nas notificações de quem deve saber
@Injectable()
export class EventNotifier {
  constructor(
    @Inject(NOTIFICATIONS_UOW) private readonly uow: NotificationsUnitOfWork,
    @Inject(NotificationDispatcher)
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  async handle(event: DomainEvent): Promise<number> {
    const { drafts, actorId } = await this.uow.run(async ({ directory }) => {
      switch (event.type) {
        case 'ModeratorRequestCreated': {
          const requesterName = (await directory.userName(event.userId)) ?? ''
          const course = await directory.course(event.courseId)
          return {
            actorId: event.userId,
            drafts: (await directory.admins()).map(
              (userId): NotificationDraft => ({
                userId,
                type: 'MODERATOR_REQUEST_CREATED',
                actorId: event.userId,
                courseId: event.courseId,
                entityType: 'moderator_request',
                entityId: event.requestId,
                groupKey: null,
                data: {
                  requestId: event.requestId,
                  requesterName,
                  courseName: course?.name ?? '',
                },
              }),
            ),
          }
        }
        case 'ModeratorRequestReviewed': {
          const course = await directory.course(event.courseId)
          return {
            actorId: event.reviewerId,
            drafts: [
              {
                userId: event.userId,
                type: 'MODERATOR_REQUEST_REVIEWED',
                actorId: event.reviewerId,
                courseId: event.courseId,
                entityType: 'moderator_request',
                entityId: event.requestId,
                groupKey: null,
                data: {
                  requestId: event.requestId,
                  courseName: course?.name ?? '',
                  courseSlug: course?.slug ?? '',
                  decision: event.decision,
                  note: event.note,
                },
              },
            ] satisfies NotificationDraft[],
          }
        }
        case 'CurriculumImportPending':
          return {
            actorId: event.importedBy,
            drafts: (await directory.admins()).map(
              (userId): NotificationDraft => ({
                userId,
                type: 'IMPORT_PENDING',
                actorId: event.importedBy,
                courseId: null,
                entityType: 'curriculum_import',
                entityId: event.importId,
                groupKey: `import-pending:${event.sigaaId}`,
                data: {
                  importId: event.importId,
                  sigaaId: event.sigaaId,
                  courseName: event.courseName,
                  imports: 1,
                },
              }),
            ),
          }
        case 'ScrapeFailed': {
          const course = await directory.course(event.courseId)
          const term = (await directory.termCode(event.termId)) ?? ''
          const users = [
            ...(await directory.moderatorsOf(event.courseId)),
            ...(await directory.admins()),
          ]
          return {
            actorId: event.actorId,
            drafts: users.map((userId): NotificationDraft => ({
              userId,
              type: 'SCRAPE_FAILED',
              actorId: event.actorId,
              courseId: event.courseId,
              entityType: 'scrape_run',
              entityId: event.runId,
              groupKey: `scrape-failed:${event.courseId}:${event.termId}`,
              data: {
                courseName: course?.name ?? '',
                courseSlug: course?.slug ?? '',
                term,
                error: event.error,
                failures: 1,
              },
            })),
          }
        }
        case 'MessageReplied': {
          const course = await directory.course(event.courseId)
          const data = {
            messageId: event.messageId,
            rootId: event.rootId,
            courseSlug: course?.slug ?? '',
            courseName: course?.name ?? '',
            authorName: (await directory.userName(event.authorId)) ?? '',
            excerpt: event.excerpt,
          }
          const base = {
            actorId: event.authorId,
            courseId: event.courseId,
            entityType: 'message',
            entityId: event.messageId,
          }
          const drafts: NotificationDraft[] = []
          if (event.parentAuthorId) {
            drafts.push({
              ...base,
              userId: event.parentAuthorId,
              type: 'FORUM_REPLY',
              groupKey: null,
              data,
            })
          }
          // Quem já escreveu na conversa; uma por conversa enquanto não lida
          for (const userId of event.threadAuthorIds) {
            if (userId === event.parentAuthorId) continue
            drafts.push({
              ...base,
              userId,
              type: 'FORUM_THREAD_REPLY',
              groupKey: `thread:${event.rootId}`,
              data,
            })
          }
          return { actorId: event.authorId, drafts }
        }
        case 'MessageModerated': {
          if (!event.authorId) return { actorId: event.moderatorId, drafts: [] }
          const course = await directory.course(event.courseId)
          return {
            actorId: event.moderatorId,
            drafts: [
              {
                userId: event.authorId,
                type: 'MESSAGE_MODERATED',
                actorId: event.moderatorId,
                courseId: event.courseId,
                entityType: 'message',
                entityId: event.messageId,
                groupKey: null,
                data: {
                  messageId: event.messageId,
                  courseSlug: course?.slug ?? '',
                  courseName: course?.name ?? '',
                  action: event.action,
                  category: event.category,
                  excerpt: event.excerpt,
                },
              },
            ] satisfies NotificationDraft[],
          }
        }
        case 'UserRestricted': {
          const course = await directory.course(event.courseId)
          return {
            actorId: event.moderatorId,
            drafts: [
              {
                userId: event.userId,
                type: 'USER_RESTRICTED',
                actorId: event.moderatorId,
                courseId: event.courseId,
                entityType: 'user_course_restriction',
                entityId: event.courseId,
                groupKey: null,
                data: {
                  courseSlug: course?.slug ?? '',
                  courseName: course?.name ?? '',
                  restriction: event.restriction,
                  lifted: event.lifted,
                  expiresAt: event.expiresAt?.toISOString() ?? null,
                },
              },
            ] satisfies NotificationDraft[],
          }
        }
        case 'MessageLiked': {
          if (!event.messageAuthorId)
            return { actorId: event.likerId, drafts: [] }
          const course = await directory.course(event.courseId)
          return {
            actorId: event.likerId,
            drafts: [
              {
                userId: event.messageAuthorId,
                type: 'FORUM_LIKES',
                actorId: event.likerId,
                courseId: event.courseId,
                entityType: 'message',
                entityId: event.messageId,
                groupKey: `likes:${event.messageId}`,
                data: {
                  messageId: event.messageId,
                  courseSlug: course?.slug ?? '',
                  excerpt: event.excerpt,
                  likerNames: [(await directory.userName(event.likerId)) ?? ''],
                  likes: 1,
                },
              },
            ] satisfies NotificationDraft[],
          }
        }
        case 'SectionsChanged':
          return {
            actorId: null,
            drafts: sectionNotifications(
              await directory.scheduleHolders([
                ...event.changedSectionIds,
                ...event.removedSectionIds,
              ]),
              {
                changed: new Set(event.changedSectionIds),
                removed: new Set(event.removedSectionIds),
              },
            ),
          }
        // Não vira notificação: quem ouve é a limpeza de arquivos
        case 'AccountDeleted':
          return { actorId: null, drafts: [] }
      }
    })
    return this.dispatcher.deliver(drafts, actorId)
  }
}

@Injectable()
export class ListNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATIONS_UOW) private readonly uow: NotificationsUnitOfWork,
  ) {}

  execute(
    userId: string,
    query: NotificationListQuery,
  ): Promise<NotificationPage> {
    const after = decodeCursor(query.cursor)
    return this.uow.run(async ({ notifications }) => {
      const rows = await notifications.list(userId, {
        after,
        limit: query.limit,
        unread: query.unread ?? false,
      })
      // O cursor segue a ordem da lista: a última atualização
      return pageOf(
        rows.map((record) => ({
          createdAt: record.updatedAt,
          id: record.id,
          record,
        })),
        query.limit,
        ({ record }) => toNotificationView(record),
      )
    })
  }
}

@Injectable()
export class UnreadCountUseCase {
  constructor(
    @Inject(NOTIFICATIONS_UOW) private readonly uow: NotificationsUnitOfWork,
  ) {}

  execute(userId: string): Promise<UnreadCount> {
    return this.uow.run(async ({ notifications }) => ({
      count: await notifications.unreadCount(userId),
    }))
  }
}

@Injectable()
export class MarkNotificationsReadUseCase {
  constructor(
    @Inject(NOTIFICATIONS_UOW) private readonly uow: NotificationsUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(userId: string, input: MarkNotificationsReadInput): Promise<void> {
    return this.uow.run(({ notifications }) =>
      notifications.markRead(
        userId,
        'all' in input ? 'all' : input.ids,
        this.clock.now(),
      ),
    )
  }
}

@Injectable()
export class GetNotificationPreferencesUseCase {
  constructor(
    @Inject(NOTIFICATIONS_UOW) private readonly uow: NotificationsUnitOfWork,
  ) {}

  execute(userId: string): Promise<NotificationPreferences> {
    return this.uow.run(async ({ preferences }) => ({
      muted: [...((await preferences.muted([userId])).get(userId) ?? [])],
    }))
  }
}

@Injectable()
export class SetNotificationPreferencesUseCase {
  constructor(
    @Inject(NOTIFICATIONS_UOW) private readonly uow: NotificationsUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(
    userId: string,
    input: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    const muted = [...new Set(input.muted)]
    return this.uow.run(async ({ preferences }) => {
      await preferences.setMuted(userId, muted, this.clock.now())
      return { muted }
    })
  }
}

// Job diário: notificações lidas há mais de 90 dias somem
@Injectable()
export class PurgeNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATIONS_UOW) private readonly uow: NotificationsUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(): Promise<number> {
    const limit = new Date(this.clock.now().getTime() - RETENTION_DAYS * DAY)
    return this.uow.run(({ notifications }) =>
      notifications.deleteReadBefore(limit),
    )
  }
}
