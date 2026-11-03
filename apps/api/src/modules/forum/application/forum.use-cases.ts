import { Inject, Injectable } from '@nestjs/common'
import { normalizeSearchText } from '@ufc-flow/academic-core'
import type {
  ConversationView,
  ForumQuery,
  LikeState,
  MessagePage,
  MessageView,
  NewMessagesCount,
  ParsedMessageInput,
  ReportReason,
  SubjectSearchQuery,
  SubjectSearchResult,
  TrendingSubject,
} from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import { CLOCK, type Clock } from '../../../shared/domain/clock'
import { decodeCursor, pageOf } from '../../../shared/domain/cursor'
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
import { blocks } from '../domain/moderation'
import {
  assertRate,
  deletionOf,
  editMessage,
  editableUntil,
  mentionCodes,
  newMessage,
  visibilityOf,
  type Message,
  type RateLimits,
  type Viewer,
} from '../domain/message'
import {
  FORUM_RATE_LIMITS,
  FORUM_UOW,
  type ForumCourse,
  type ForumRepositories,
  type ForumUnitOfWork,
  type MessageRow,
} from '../domain/ports'

const TRENDING_DAYS = 7
const TRENDING_LIMIT = 5
const HOUR_MS = 60 * 60 * 1000
const EXCERPT = 140

const excerptOf = (content: string) =>
  content.length > EXCERPT ? `${content.slice(0, EXCERPT - 1)}…` : content

export function toMessageView(
  row: MessageRow,
  viewer: Viewer,
  now: Date,
): MessageView {
  const full = visibilityOf(row, viewer) === 'FULL'
  const until = editableUntil(row, viewer.userId, now)
  return {
    id: row.id,
    courseId: row.courseId,
    parentId: row.parentId,
    rootId: row.rootId,
    author:
      row.authorId && row.authorName
        ? {
            id: row.authorId,
            name: row.authorName,
            avatarFileId: row.authorAvatarFileId,
          }
        : null,
    replyingTo:
      row.parentId && row.parentAuthorName
        ? { id: row.parentId, authorName: row.parentAuthorName }
        : null,
    content: full ? row.content : null,
    status: row.status,
    removedBy:
      row.status !== 'REMOVED'
        ? null
        : row.removedBy !== null && row.removedBy === row.authorId
          ? 'AUTHOR'
          : 'MODERATION',
    removalCategory:
      row.status === 'REMOVED' &&
      row.removedBy !== row.authorId &&
      row.removalReason
        ? (row.removalReason as ReportReason)
        : null,
    replyCount: row.replyCount,
    likeCount: row.likeCount,
    likedByMe: row.likedByMe,
    mentions: full ? row.mentions : [],
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
    editableUntil: until?.toISOString() ?? null,
  }
}

async function activeCourse(repos: ForumRepositories, slug: string) {
  const course = await repos.catalog.course(slug)
  if (!course?.isActive) throw ForumErrors.courseNotFound()
  return course
}

// Ler o fórum exige login (Matriz de permissões)
function assertCanRead(actor: Actor) {
  if (!AccessPolicy.canReadForum(actor)) throw ForumErrors.loginRequired()
}

function assertCanPost(actor: Actor, courseId: string): string {
  if (!actor.userId || !AccessPolicy.canPostInForum(actor, courseId)) {
    throw ForumErrors.cannotPost()
  }
  return actor.userId
}

// Restrição da moderação no curso: BAN não lê; MUTE lê, mas não escreve
// nem curte. Moderação e admin nunca são restringidos.
export async function assertAccess(
  repos: ForumRepositories,
  actor: Actor,
  courseId: string,
  action: 'READ' | 'WRITE',
  now: Date,
) {
  if (!actor.userId || AccessPolicy.canModerateForum(actor, courseId)) return
  const restriction = await repos.restrictions.active(
    actor.userId,
    courseId,
    now,
  )
  if (blocks(restriction, 'READ')) throw ForumErrors.banned()
  if (action === 'WRITE' && blocks(restriction, 'WRITE')) {
    throw ForumErrors.muted()
  }
}

const viewerOf = (actor: Actor, courseId: string): Viewer => ({
  userId: actor.userId,
  canModerate: AccessPolicy.canModerateForum(actor, courseId),
})

// Mensagem que quem lê pode alcançar, com o curso dela (ativo)
export async function reachable(
  repos: ForumRepositories,
  actor: Actor,
  id: string,
  now: Date,
): Promise<{ message: Message; course: ForumCourse; viewer: Viewer }> {
  const message = await repos.messages.findById(id)
  const course = message && (await repos.catalog.courseById(message.courseId))
  if (!message || !course?.isActive) throw ForumErrors.messageNotFound()
  await assertAccess(repos, actor, course.id, 'READ', now)
  const viewer = viewerOf(actor, course.id)
  if (visibilityOf(message, viewer) === 'NONE') {
    throw ForumErrors.messageNotFound()
  }
  return { message, course, viewer }
}

const pageOfRows = (
  rows: MessageRow[],
  limit: number,
  viewer: Viewer,
  now: Date,
): MessagePage => pageOf(rows, limit, (row) => toMessageView(row, viewer, now))

// Disciplinas citadas que existem no catálogo; código desconhecido continua
// texto comum
async function mentionIds(repos: ForumRepositories, content: string) {
  const codes = mentionCodes(content)
  if (codes.length === 0) return []
  return (await repos.catalog.subjectsByCode(codes)).map(
    (subject) => subject.id,
  )
}

async function viewOf(
  repos: ForumRepositories,
  id: string,
  viewer: Viewer,
  now: Date,
): Promise<MessageView> {
  const [row] = await repos.reader.rows([id], viewer.userId)
  if (!row) throw ForumErrors.messageNotFound()
  return toMessageView(row, viewer, now)
}

@Injectable()
export class ReadForumUseCase {
  constructor(
    @Inject(FORUM_UOW) private readonly uow: ForumUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async timeline(
    actor: Actor,
    courseSlug: string,
    query: ForumQuery,
  ): Promise<MessagePage> {
    assertCanRead(actor)
    const after = decodeCursor(query.cursor)
    return this.uow.run(async (repos) => {
      const course = await activeCourse(repos, courseSlug)
      await assertAccess(repos, actor, course.id, 'READ', this.clock.now())
      const viewer = viewerOf(actor, course.id)
      const rows = await repos.reader.timeline(
        course.id,
        viewer,
        after,
        query.limit,
      )
      return pageOfRows(rows, query.limit, viewer, this.clock.now())
    })
  }

  async newCount(
    actor: Actor,
    courseSlug: string,
    since: Date,
  ): Promise<NewMessagesCount> {
    assertCanRead(actor)
    return this.uow.run(async (repos) => {
      const course = await activeCourse(repos, courseSlug)
      await assertAccess(repos, actor, course.id, 'READ', this.clock.now())
      return {
        count: await repos.reader.countNewRoots(course.id, since, actor.userId),
      }
    })
  }

  async conversation(actor: Actor, id: string): Promise<ConversationView> {
    assertCanRead(actor)
    return this.uow.run(async (repos) => {
      const { message, viewer } = await reachable(
        repos,
        actor,
        id,
        this.clock.now(),
      )
      const now = this.clock.now()
      // A cadeia até a raiz, da raiz para baixo
      const ancestors: Message[] = []
      let parentId = message.parentId
      while (parentId) {
        const parent = await repos.messages.findById(parentId)
        if (!parent) break
        ancestors.unshift(parent)
        parentId = parent.parentId
      }
      const rows = await repos.reader.rows(
        [...ancestors.map((item) => item.id), message.id],
        viewer.userId,
      )
      const byId = new Map(rows.map((row) => [row.id, row]))
      const limit = 20
      const replies = await repos.reader.replies(
        message.id,
        viewer,
        null,
        limit,
      )
      return {
        ancestors: ancestors.map((item) =>
          toMessageView(byId.get(item.id)!, viewer, now),
        ),
        message: toMessageView(byId.get(message.id)!, viewer, now),
        replies: pageOfRows(replies, limit, viewer, now),
      }
    })
  }

  async replies(
    actor: Actor,
    id: string,
    query: ForumQuery,
  ): Promise<MessagePage> {
    assertCanRead(actor)
    const after = decodeCursor(query.cursor)
    return this.uow.run(async (repos) => {
      const { message, viewer } = await reachable(
        repos,
        actor,
        id,
        this.clock.now(),
      )
      const rows = await repos.reader.replies(
        message.id,
        viewer,
        after,
        query.limit,
      )
      return pageOfRows(rows, query.limit, viewer, this.clock.now())
    })
  }

  // Aba "Discussões" da disciplina
  async bySubject(
    actor: Actor,
    courseSlug: string,
    code: string,
    query: ForumQuery,
  ): Promise<MessagePage> {
    assertCanRead(actor)
    const after = decodeCursor(query.cursor)
    return this.uow.run(async (repos) => {
      const course = await activeCourse(repos, courseSlug)
      await assertAccess(repos, actor, course.id, 'READ', this.clock.now())
      const subject = await repos.catalog.subjectByCode(code)
      if (!subject) throw ForumErrors.subjectNotFound()
      const viewer = viewerOf(actor, course.id)
      const rows = await repos.reader.bySubject(
        course.id,
        subject.id,
        actor.userId,
        after,
        query.limit,
      )
      return pageOfRows(rows, query.limit, viewer, this.clock.now())
    })
  }

  async trending(actor: Actor, courseSlug: string): Promise<TrendingSubject[]> {
    assertCanRead(actor)
    return this.uow.run(async (repos) => {
      const course = await activeCourse(repos, courseSlug)
      await assertAccess(repos, actor, course.id, 'READ', this.clock.now())
      const since = new Date(
        this.clock.now().getTime() - TRENDING_DAYS * 24 * HOUR_MS,
      )
      return repos.reader.trendingSubjects(course.id, since, TRENDING_LIMIT)
    })
  }
}

@Injectable()
export class SearchSubjectsUseCase {
  constructor(@Inject(FORUM_UOW) private readonly uow: ForumUnitOfWork) {}

  execute(
    courseSlug: string,
    query: SubjectSearchQuery,
  ): Promise<SubjectSearchResult[]> {
    return this.uow.run(async (repos) => {
      const course = await activeCourse(repos, courseSlug)
      const term = normalizeSearchText(query.q).replace(/^@/, '')
      if (!term) return []
      return repos.catalog.searchSubjects(course.id, term, query.limit)
    })
  }
}

@Injectable()
export class WriteForumUseCase {
  constructor(
    @Inject(FORUM_UOW) private readonly uow: ForumUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
    @Inject(FORUM_RATE_LIMITS) private readonly limits: RateLimits,
  ) {}

  private async checkRate(repos: ForumRepositories, authorId: string) {
    const now = this.clock.now().getTime()
    const [inBurst, inHour] = await Promise.all([
      repos.messages.countByAuthorSince(
        authorId,
        new Date(now - this.limits.burstSeconds * 1000),
      ),
      repos.messages.countByAuthorSince(authorId, new Date(now - HOUR_MS)),
    ])
    assertRate({ inBurst, inHour }, this.limits)
  }

  async post(
    actor: Actor,
    courseSlug: string,
    input: ParsedMessageInput,
  ): Promise<MessageView> {
    const { view } = await this.uow.run(async (repos) => {
      const course = await activeCourse(repos, courseSlug)
      return this.write(repos, actor, course, null, input.content)
    })
    return view
  }

  async reply(
    actor: Actor,
    parentId: string,
    input: ParsedMessageInput,
  ): Promise<MessageView> {
    const { view, event } = await this.uow.run(async (repos) => {
      const { message: parent, course } = await reachable(
        repos,
        actor,
        parentId,
        this.clock.now(),
      )
      return this.write(repos, actor, course, parent, input.content)
    })
    if (event) this.events.publish([event])
    return view
  }

  private async write(
    repos: ForumRepositories,
    actor: Actor,
    course: ForumCourse,
    parent: Message | null,
    content: string,
  ): Promise<{ view: MessageView; event: DomainEvent | null }> {
    const authorId = assertCanPost(actor, course.id)
    await assertAccess(repos, actor, course.id, 'WRITE', this.clock.now())
    const subjectIds = await mentionIds(repos, content)
    await this.checkRate(repos, authorId)
    const now = this.clock.now()
    const message = newMessage({
      id: this.ids.next(),
      courseId: course.id,
      authorId,
      content,
      parent,
      now,
    })
    await repos.messages.save(message, subjectIds)
    let event: DomainEvent | null = null
    if (parent) {
      await repos.messages.addReplies(parent.id, 1)
      event = {
        type: 'MessageReplied',
        messageId: message.id,
        rootId: message.rootId!,
        courseId: course.id,
        authorId,
        parentAuthorId: parent.authorId,
        threadAuthorIds: await repos.reader.threadAuthors(message.rootId!),
        excerpt: excerptOf(content),
        occurredAt: now,
      }
    }
    const view = await viewOf(
      repos,
      message.id,
      viewerOf(actor, course.id),
      now,
    )
    return { view, event }
  }

  async edit(
    actor: Actor,
    id: string,
    input: ParsedMessageInput,
  ): Promise<MessageView> {
    return this.uow.run(async (repos) => {
      const { message, viewer } = await reachable(
        repos,
        actor,
        id,
        this.clock.now(),
      )
      if (!actor.userId) throw ForumErrors.notAuthor()
      await assertAccess(
        repos,
        actor,
        message.courseId,
        'WRITE',
        this.clock.now(),
      )
      const now = this.clock.now()
      const edited = editMessage(message, actor.userId, input.content, now)
      await repos.messages.save(edited, await mentionIds(repos, edited.content))
      return viewOf(repos, id, viewer, now)
    })
  }

  async remove(actor: Actor, id: string): Promise<void> {
    return this.uow.run(async (repos) => {
      const { message } = await reachable(repos, actor, id, this.clock.now())
      if (!actor.userId) throw ForumErrors.notAuthor()
      const result = deletionOf(message, actor.userId, this.clock.now())
      if (result.kind === 'REMOVE') {
        // O conteúdo sai; as menções também
        await repos.messages.save(result.message, [])
        return
      }
      await repos.messages.delete(message.id)
      if (message.parentId)
        await repos.messages.addReplies(message.parentId, -1)
    })
  }

  async like(actor: Actor, id: string): Promise<LikeState> {
    const { state, event } = await this.uow.run(async (repos) => {
      const { message } = await reachable(repos, actor, id, this.clock.now())
      const userId = assertCanPost(actor, message.courseId)
      await assertAccess(
        repos,
        actor,
        message.courseId,
        'WRITE',
        this.clock.now(),
      )
      if (message.status !== 'VISIBLE') throw ForumErrors.unavailable()
      const now = this.clock.now()
      const added = await repos.likes.add(message.id, userId, now)
      const likeCount = added
        ? await repos.messages.addLikes(message.id, 1)
        : message.likeCount
      const event: DomainEvent | null = added
        ? {
            type: 'MessageLiked',
            messageId: message.id,
            courseId: message.courseId,
            likerId: userId,
            messageAuthorId: message.authorId,
            excerpt: excerptOf(message.content),
            occurredAt: now,
          }
        : null
      return { state: { likeCount, likedByMe: true }, event }
    })
    if (event) this.events.publish([event])
    return state
  }

  async unlike(actor: Actor, id: string): Promise<LikeState> {
    return this.uow.run(async (repos) => {
      const { message } = await reachable(repos, actor, id, this.clock.now())
      const userId = assertCanPost(actor, message.courseId)
      await assertAccess(
        repos,
        actor,
        message.courseId,
        'WRITE',
        this.clock.now(),
      )
      const removed = await repos.likes.remove(message.id, userId)
      const likeCount = removed
        ? await repos.messages.addLikes(message.id, -1)
        : message.likeCount
      return { likeCount, likedByMe: false }
    })
  }
}
