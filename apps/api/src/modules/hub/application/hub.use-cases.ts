import { Inject, Injectable } from '@nestjs/common'
import { normalizeSearchText } from '@ufc-flow/academic-core'
import {
  type FilePurpose,
  type HubDeadline,
  type HubFeed,
  type HubQuery,
  type HubUnread,
  type ParsedPostInput,
  type PostListItem,
  type PostView,
} from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import { CLOCK, type Clock } from '../../../shared/domain/clock'
import { decodeCursor, pageOf } from '../../../shared/domain/cursor'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import { FilesErrors } from '../../files/domain/errors'
import {
  attachFile,
  checkAttachable,
  markDeleted,
} from '../../files/domain/file'
import { HubErrors } from '../domain/errors'
import {
  HUB_UOW,
  type HubRepositories,
  type HubUnitOfWork,
  type PostRow,
} from '../domain/ports'
import {
  deadlineOf,
  editPost,
  isClosed,
  newPost,
  postSlug,
  slugBase,
  unreadSince,
  type Post,
  type PostFields,
} from '../domain/post'

const DEADLINES_LIMIT = 5

const iso = (date: Date | null) => (date ? date.toISOString() : null)

export function toPostView(row: PostRow, now: Date): PostView {
  return {
    id: row.id,
    courseId: row.courseId,
    type: row.type,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    bodyMd: row.bodyMd,
    coverFileId: row.coverFileId,
    imageFileIds: row.imageFileIds,
    externalUrl: row.externalUrl,
    status: row.status,
    pinned: row.pinned,
    publishedAt: iso(row.publishedAt),
    startsAt: iso(row.startsAt),
    endsAt: iso(row.endsAt),
    deadlineAt: iso(row.deadlineAt),
    location: row.location,
    attributes: row.attributes,
    closed: isClosed(row, now),
    author:
      row.authorId && row.authorName
        ? { id: row.authorId, name: row.authorName }
        : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

const toListItem = (row: PostRow, now: Date): PostListItem => {
  const { bodyMd: _body, imageFileIds: _images, ...item } = toPostView(row, now)
  return item
}

async function activeCourse(repos: HubRepositories, slug: string) {
  const course = await repos.courses.findBySlug(slug)
  if (!course?.isActive) throw HubErrors.courseNotFound()
  return course
}

// Moderador do curso ou admin; no institucional, só admin
function assertCanManage(actor: Actor, courseId: string | null) {
  if (courseId === null) {
    if (!actor.isAdmin) throw HubErrors.institutionalOnlyAdmin()
  } else if (!AccessPolicy.canManageHub(actor, courseId)) {
    throw HubErrors.accessDenied()
  }
}

const canManage = (actor: Actor, courseId: string | null) =>
  courseId === null ? actor.isAdmin : AccessPolicy.canManageHub(actor, courseId)

@Injectable()
export class GetHubFeedUseCase {
  constructor(
    @Inject(HUB_UOW) private readonly uow: HubUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(actor: Actor, courseSlug: string, query: HubQuery): Promise<HubFeed> {
    return this.uow.run(async (repos) => {
      const course = await activeCourse(repos, courseSlug)
      // Rascunhos e arquivados só para quem modera o curso
      if (query.status !== 'PUBLISHED') assertCanManage(actor, course.id)
      const now = this.clock.now()
      const filter = {
        courseId: course.id,
        type: query.type,
        upcoming: query.upcoming,
        q: query.q ? normalizeSearchText(query.q) : undefined,
        status: query.status,
        includeInstitutional: query.status === 'PUBLISHED' || actor.isAdmin,
        now,
      }
      const after = decodeCursor(query.cursor)
      const pinned =
        after === null && query.status === 'PUBLISHED'
          ? await repos.reader.pinned(filter)
          : []
      const rows = await repos.reader.page(filter, after, query.limit)
      // O cursor anda pela data de publicação (ou de criação, no rascunho)
      const page = pageOf(
        rows.map((row) => ({
          row,
          id: row.id,
          createdAt: row.publishedAt ?? row.createdAt,
        })),
        query.limit,
        ({ row }) => toListItem(row, now),
      )
      return {
        pinned: pinned.map((row) => toListItem(row, now)),
        ...page,
      }
    })
  }
}

@Injectable()
export class GetPostUseCase {
  constructor(
    @Inject(HUB_UOW) private readonly uow: HubUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // O post do curso tem prioridade sobre o institucional de mesmo slug
  execute(actor: Actor, courseSlug: string, slug: string): Promise<PostView> {
    return this.uow.run(async (repos) => {
      const course = await activeCourse(repos, courseSlug)
      const post =
        (await repos.posts.findBySlug(course.id, slug)) ??
        (await repos.posts.findBySlug(null, slug))
      if (
        !post ||
        post.deletedAt ||
        (post.status !== 'PUBLISHED' && !canManage(actor, post.courseId))
      ) {
        throw HubErrors.postNotFound()
      }
      const row = await repos.reader.findRow(post.id)
      return toPostView(row!, this.clock.now())
    })
  }
}

@Injectable()
export class GetHubDeadlinesUseCase {
  constructor(
    @Inject(HUB_UOW) private readonly uow: HubUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(courseSlug: string): Promise<HubDeadline[]> {
    return this.uow.run(async (repos) => {
      const course = await activeCourse(repos, courseSlug)
      const posts = await repos.reader.deadlines(
        course.id,
        this.clock.now(),
        DEADLINES_LIMIT,
      )
      return posts.map((post) => ({
        postId: post.id,
        slug: post.slug,
        type: post.type,
        title: post.title,
        at: deadlineOf(post)!.toISOString(),
        endsAt: iso(post.endsAt),
      }))
    })
  }
}

const fieldsOf = (input: ParsedPostInput): PostFields => ({
  ...input,
  attributes: input.attributes,
})

// Liga capa e galeria novas (do curso do post, de quem envia) e solta as que
// saíram, que a limpeza apaga do disco
async function syncFiles(
  repos: HubRepositories,
  actor: Actor,
  courseId: string | null,
  previous: Pick<Post, 'coverFileId' | 'imageFileIds'> | null,
  next: Pick<Post, 'coverFileId' | 'imageFileIds'>,
  now: Date,
) {
  const before = new Set(
    [previous?.coverFileId, ...(previous?.imageFileIds ?? [])].filter(
      (id): id is string => Boolean(id),
    ),
  )
  const wanted: [string, FilePurpose][] = [
    ...(next.coverFileId
      ? [[next.coverFileId, 'POST_COVER'] as [string, FilePurpose]]
      : []),
    ...next.imageFileIds.map(
      (id) => [id, 'POST_IMAGE'] as [string, FilePurpose],
    ),
  ]
  for (const [id, purpose] of wanted) {
    if (before.has(id)) continue
    const file = await repos.files.findById(id)
    if (!file || file.courseId !== courseId) throw FilesErrors.fileNotFound()
    checkAttachable(file, { ownerId: actor.userId!, purpose })
    await repos.files.save(attachFile(file, now))
  }
  const kept = new Set(wanted.map(([id]) => id))
  for (const id of before) {
    if (kept.has(id)) continue
    const file = await repos.files.findById(id)
    if (file) await repos.files.save(markDeleted(file, now))
  }
}

@Injectable()
export class SavePostUseCase {
  constructor(
    @Inject(HUB_UOW) private readonly uow: HubUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  // Post do curso, ou institucional quando courseSlug é nulo
  create(
    actor: Actor,
    courseSlug: string | null,
    input: ParsedPostInput,
  ): Promise<PostView> {
    return this.uow.run(async (repos) => {
      const courseId = courseSlug
        ? (await activeCourse(repos, courseSlug)).id
        : null
      assertCanManage(actor, courseId)
      const fields = fieldsOf(input)
      const now = this.clock.now()
      const post = newPost({
        id: this.ids.next(),
        courseId,
        authorId: actor.userId!,
        slug: postSlug(
          fields.title,
          await repos.posts.slugsLike(courseId, slugBase(fields.title)),
        ),
        fields,
        now,
      })
      await syncFiles(repos, actor, courseId, null, post, now)
      await repos.posts.save(post)
      return toPostView((await repos.reader.findRow(post.id))!, now)
    })
  }

  update(actor: Actor, id: string, input: ParsedPostInput): Promise<PostView> {
    return this.uow.run(async (repos) => {
      const post = await repos.posts.findById(id)
      if (!post || post.deletedAt) throw HubErrors.postNotFound()
      assertCanManage(actor, post.courseId)
      const now = this.clock.now()
      const edited = editPost(post, fieldsOf(input), now)
      await syncFiles(repos, actor, post.courseId, post, edited, now)
      await repos.posts.save(edited)
      return toPostView((await repos.reader.findRow(id))!, now)
    })
  }

  // Exclusão lógica; capa e galeria são soltas
  remove(actor: Actor, id: string): Promise<void> {
    return this.uow.run(async (repos) => {
      const post = await repos.posts.findById(id)
      if (!post || post.deletedAt) throw HubErrors.postNotFound()
      assertCanManage(actor, post.courseId)
      const now = this.clock.now()
      await syncFiles(
        repos,
        actor,
        post.courseId,
        post,
        { coverFileId: null, imageFileIds: [] },
        now,
      )
      await repos.posts.save({
        ...post,
        coverFileId: null,
        imageFileIds: [],
        deletedAt: now,
        updatedAt: now,
      })
    })
  }
}

// Badge de novidades: posts publicados desde a última visita ao hub (D74)
@Injectable()
export class HubReadsUseCase {
  constructor(
    @Inject(HUB_UOW) private readonly uow: HubUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  unread(userId: string, courseSlug: string): Promise<HubUnread> {
    return this.uow.run(async (repos) => {
      const course = await activeCourse(repos, courseSlug)
      const now = this.clock.now()
      const since = unreadSince(
        await repos.reads.lastSeen(userId, course.id),
        now,
      )
      return { count: await repos.reader.unreadCount(course.id, since) }
    })
  }

  markRead(userId: string, courseSlug: string): Promise<void> {
    return this.uow.run(async (repos) => {
      const course = await activeCourse(repos, courseSlug)
      await repos.reads.touch(userId, course.id, this.clock.now())
    })
  }
}
