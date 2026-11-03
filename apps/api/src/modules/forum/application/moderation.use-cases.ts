import { Inject, Injectable } from '@nestjs/common'
import type {
  DismissReportsInput,
  LiftRestrictionInput,
  MessageModerationInput,
  MessageView,
  ModerationSummary,
  MyRestriction,
  ParsedReportInput,
  ReportQueueItem,
  ReportReason,
  RestrictionInput,
  RestrictionView,
} from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  EVENT_PUBLISHER,
  type DomainEvent,
  type EventPublisher,
} from '../../../shared/domain/events'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import { ForumErrors } from '../domain/errors'
import type { Message } from '../domain/message'
import {
  assertCanReport,
  assertCanRestrict,
  isActive,
  moderate,
  newRestriction,
  shouldAutoHide,
  type ModerationAction,
} from '../domain/moderation'
import {
  FORUM_UOW,
  type CourseScope,
  type ForumRepositories,
  type ForumUnitOfWork,
} from '../domain/ports'
import { reachable, toMessageView } from './forum.use-cases'

const QUEUE_LIMIT = 100
const EXCERPT = 140

const excerptOf = (content: string) =>
  content.length > EXCERPT ? `${content.slice(0, EXCERPT - 1)}…` : content

const ACTIONS: Record<MessageModerationInput['action'], ModerationAction> = {
  HIDE: 'HIDE_MESSAGE',
  REMOVE: 'REMOVE_MESSAGE',
  RESTORE: 'RESTORE_MESSAGE',
}

function assertModerates(actor: Actor, courseId: string): string {
  if (!actor.userId || !AccessPolicy.canModerateForum(actor, courseId)) {
    throw ForumErrors.moderationDenied()
  }
  return actor.userId
}

// Fila do admin: todos os cursos; do moderador: os que modera, ou um deles
async function scopeOf(
  repos: ForumRepositories,
  actor: Actor,
  courseSlug: string | undefined,
): Promise<CourseScope> {
  if (courseSlug) {
    const course = await repos.catalog.course(courseSlug)
    if (!course) throw ForumErrors.courseNotFound()
    assertModerates(actor, course.id)
    return [course.id]
  }
  if (actor.isAdmin) return 'ALL'
  if (actor.moderatedCourseIds.size === 0) throw ForumErrors.moderationDenied()
  return [...actor.moderatedCourseIds]
}

const moderatedEvent = (
  message: Message,
  action: MessageModerationInput['action'],
  moderatorId: string | null,
  now: Date,
): DomainEvent => ({
  type: 'MessageModerated',
  messageId: message.id,
  courseId: message.courseId,
  authorId: message.authorId,
  moderatorId,
  action,
  category:
    action === 'REMOVE' ? (message.removalReason as ReportReason | null) : null,
  excerpt: excerptOf(message.content),
  occurredAt: now,
})

@Injectable()
export class ReportMessageUseCase {
  constructor(
    @Inject(FORUM_UOW) private readonly uow: ForumUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  // Uma denúncia por pessoa; a 3ª aberta de pessoas diferentes oculta
  async execute(
    actor: Actor,
    messageId: string,
    input: ParsedReportInput,
  ): Promise<void> {
    if (!actor.userId) throw ForumErrors.loginRequired()
    const reporterId = actor.userId
    const event = await this.uow.run(async (repos) => {
      const now = this.clock.now()
      const { message } = await reachable(repos, actor, messageId, now)
      assertCanReport(message, reporterId)
      const inserted = await repos.reports.insert({
        id: this.ids.next(),
        messageId: message.id,
        reporterId,
        reason: input.reason,
        details: input.details,
        contentSnapshot: message.content,
        status: 'OPEN',
        resolvedBy: null,
        resolvedAt: null,
        createdAt: now,
      })
      if (!inserted) throw ForumErrors.alreadyReported()
      if (
        !shouldAutoHide(message, await repos.reports.openReporters(message.id))
      ) {
        return null
      }
      const hidden: Message = { ...message, status: 'HIDDEN' }
      await repos.messages.save(
        hidden,
        await currentMentions(repos, message.id),
      )
      return moderatedEvent(hidden, 'HIDE', null, now)
    })
    if (event) this.events.publish([event])
  }
}

// Menções atuais (a moderação muda a situação, não o texto)
async function currentMentions(repos: ForumRepositories, id: string) {
  const [row] = await repos.reader.rows([id], null)
  if (!row || row.mentions.length === 0) return []
  return (
    await repos.catalog.subjectsByCode(row.mentions.map((item) => item.code))
  ).map((subject) => subject.id)
}

@Injectable()
export class ModerateMessageUseCase {
  constructor(
    @Inject(FORUM_UOW) private readonly uow: ForumUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  // Ocultar ou remover aceita as denúncias abertas; restaurar as descarta
  async execute(
    actor: Actor,
    messageId: string,
    input: MessageModerationInput,
  ): Promise<MessageView> {
    const { view, event } = await this.uow.run(async (repos) => {
      const now = this.clock.now()
      const message = await repos.messages.findById(messageId)
      if (!message) throw ForumErrors.messageNotFound()
      const moderatorId = assertModerates(actor, message.courseId)
      const moderated = moderate(message, input, moderatorId, now)
      await repos.messages.save(
        moderated,
        await currentMentions(repos, message.id),
      )
      await repos.reports.resolveOpen(
        message.id,
        input.action === 'RESTORE' ? 'DISMISSED' : 'ACCEPTED',
        moderatorId,
        now,
      )
      await repos.moderationLog.record({
        id: this.ids.next(),
        courseId: message.courseId,
        moderatorId,
        action: ACTIONS[input.action],
        targetMessageId: message.id,
        targetUserId: message.authorId,
        reason: input.reason,
        createdAt: now,
      })
      const [row] = await repos.reader.rows([message.id], moderatorId)
      return {
        view: toMessageView(
          row!,
          { userId: moderatorId, canModerate: true },
          now,
        ),
        event: moderatedEvent(moderated, input.action, moderatorId, now),
      }
    })
    this.events.publish([event])
    return view
  }

  // Descartar as denúncias; a oculta volta ao ar
  async dismiss(
    actor: Actor,
    messageId: string,
    input: DismissReportsInput,
  ): Promise<void> {
    const event = await this.uow.run(async (repos) => {
      const now = this.clock.now()
      const message = await repos.messages.findById(messageId)
      if (!message) throw ForumErrors.messageNotFound()
      const moderatorId = assertModerates(actor, message.courseId)
      const closed = await repos.reports.resolveOpen(
        message.id,
        'DISMISSED',
        moderatorId,
        now,
      )
      if (closed === 0) throw ForumErrors.noOpenReports()
      if (message.status !== 'HIDDEN') return null
      const restored = moderate(
        message,
        { action: 'RESTORE', reason: input.reason },
        moderatorId,
        now,
      )
      await repos.messages.save(
        restored,
        await currentMentions(repos, message.id),
      )
      await repos.moderationLog.record({
        id: this.ids.next(),
        courseId: message.courseId,
        moderatorId,
        action: 'RESTORE_MESSAGE',
        targetMessageId: message.id,
        targetUserId: message.authorId,
        reason: input.reason,
        createdAt: now,
      })
      return moderatedEvent(restored, 'RESTORE', moderatorId, now)
    })
    if (event) this.events.publish([event])
  }
}

@Injectable()
export class RestrictUserUseCase {
  constructor(
    @Inject(FORUM_UOW) private readonly uow: ForumUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  // Uma restrição ativa por pessoa e curso: a nova substitui a anterior
  async restrict(
    actor: Actor,
    input: RestrictionInput,
  ): Promise<RestrictionView> {
    const { view, event } = await this.uow.run(async (repos) => {
      const now = this.clock.now()
      const course = await repos.catalog.course(input.courseSlug)
      if (!course) throw ForumErrors.courseNotFound()
      const moderatorId = assertModerates(actor, course.id)
      const target = await repos.moderation.target(input.userId, course.id)
      if (!target) throw ForumErrors.userNotFound()
      assertCanRestrict(moderatorId, target)
      const previous = await repos.restrictions.active(
        input.userId,
        course.id,
        now,
      )
      if (previous) {
        await repos.restrictions.save({ ...previous, liftedAt: now })
      }
      const restriction = newRestriction({
        id: this.ids.next(),
        userId: input.userId,
        courseId: course.id,
        type: input.type,
        reason: input.reason,
        createdBy: moderatorId,
        days: input.days,
        now,
      })
      await repos.restrictions.save(restriction)
      await repos.moderationLog.record({
        id: this.ids.next(),
        courseId: course.id,
        moderatorId,
        action: input.type === 'MUTE' ? 'MUTE_USER' : 'BAN_USER',
        targetMessageId: null,
        targetUserId: input.userId,
        reason: input.reason,
        createdAt: now,
      })
      const event: DomainEvent = {
        type: 'UserRestricted',
        userId: input.userId,
        courseId: course.id,
        moderatorId,
        restriction: input.type,
        lifted: false,
        expiresAt: restriction.expiresAt,
        occurredAt: now,
      }
      return {
        view: (await repos.moderation.restrictionView(restriction.id))!,
        event,
      }
    })
    this.events.publish([event])
    return view
  }

  async lift(
    actor: Actor,
    id: string,
    input: LiftRestrictionInput,
  ): Promise<void> {
    const event = await this.uow.run(async (repos) => {
      const now = this.clock.now()
      const restriction = await repos.restrictions.findById(id)
      if (!restriction || !isActive(restriction, now)) {
        throw ForumErrors.restrictionNotFound()
      }
      const moderatorId = assertModerates(actor, restriction.courseId)
      await repos.restrictions.save({ ...restriction, liftedAt: now })
      await repos.moderationLog.record({
        id: this.ids.next(),
        courseId: restriction.courseId,
        moderatorId,
        action: 'LIFT_RESTRICTION',
        targetMessageId: null,
        targetUserId: restriction.userId,
        reason: input.reason,
        createdAt: now,
      })
      return {
        type: 'UserRestricted',
        userId: restriction.userId,
        courseId: restriction.courseId,
        moderatorId,
        restriction: restriction.type,
        lifted: true,
        expiresAt: null,
        occurredAt: now,
      } satisfies DomainEvent
    })
    this.events.publish([event])
  }
}

@Injectable()
export class ModerationQueueUseCase {
  constructor(
    @Inject(FORUM_UOW) private readonly uow: ForumUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  reports(actor: Actor, courseSlug?: string): Promise<ReportQueueItem[]> {
    return this.uow.run(async (repos) =>
      repos.moderation.queue(
        await scopeOf(repos, actor, courseSlug),
        QUEUE_LIMIT,
      ),
    )
  }

  restrictions(actor: Actor, courseSlug?: string): Promise<RestrictionView[]> {
    return this.uow.run(async (repos) =>
      repos.moderation.activeRestrictions(
        await scopeOf(repos, actor, courseSlug),
        this.clock.now(),
      ),
    )
  }

  summary(actor: Actor): Promise<ModerationSummary> {
    return this.uow.run(async (repos) => {
      const scope = await scopeOf(repos, actor, undefined)
      return {
        openReports: await repos.moderation.openReportCount(scope),
        activeRestrictions: (
          await repos.moderation.activeRestrictions(scope, this.clock.now())
        ).length,
        pendingRequests: actor.isAdmin
          ? await repos.moderation.pendingModeratorRequests()
          : null,
      }
    })
  }

  // Para o fórum avisar quem foi silenciado ou banido
  mine(actor: Actor, courseSlug: string): Promise<MyRestriction> {
    return this.uow.run(async (repos) => {
      const course = await repos.catalog.course(courseSlug)
      if (!course?.isActive) throw ForumErrors.courseNotFound()
      if (!actor.userId) return null
      const restriction = await repos.restrictions.active(
        actor.userId,
        course.id,
        this.clock.now(),
      )
      return restriction
        ? {
            type: restriction.type,
            expiresAt: restriction.expiresAt?.toISOString() ?? null,
          }
        : null
    })
  }
}
