import type { PostStatus, PostType } from '@ufc-flow/contracts'

import { slugify } from '../../catalog/domain/course'

// Campos editáveis, já validados pelo postInputSchema (datas em ISO)
export type PostFields = {
  type: PostType
  title: string
  summary: string | null
  bodyMd: string
  coverFileId: string | null
  imageFileIds: string[]
  externalUrl: string | null
  status: PostStatus
  pinned: boolean
  startsAt: string | null
  endsAt: string | null
  deadlineAt: string | null
  location: string | null
  attributes: Record<string, unknown>
}

export type Post = Omit<PostFields, 'startsAt' | 'endsAt' | 'deadlineAt'> & {
  id: string
  // Nulo no post institucional (todos os cursos)
  courseId: string | null
  authorId: string | null
  slug: string
  startsAt: Date | null
  endsAt: Date | null
  deadlineAt: Date | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

const DAY_MS = 24 * 60 * 60 * 1000

// Sem visita anterior, contam como novidade os posts dos últimos 7 dias
export const UNREAD_WINDOW_DAYS = 7

// Slug pelo título, único no curso: o segundo ganha "-2", e assim por diante
export const slugBase = (title: string) => slugify(title) || 'post'

export function postSlug(title: string, taken: ReadonlySet<string>): string {
  const base = slugBase(title)
  if (!taken.has(base)) return base
  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) suffix++
  return `${base}-${suffix}`
}

const toDate = (iso: string | null) => (iso ? new Date(iso) : null)

function apply(fields: PostFields) {
  return {
    ...fields,
    startsAt: toDate(fields.startsAt),
    endsAt: toDate(fields.endsAt),
    deadlineAt: toDate(fields.deadlineAt),
  }
}

export function newPost(input: {
  id: string
  courseId: string | null
  authorId: string
  slug: string
  fields: PostFields
  now: Date
}): Post {
  const { fields, now } = input
  return {
    ...apply(fields),
    id: input.id,
    courseId: input.courseId,
    authorId: input.authorId,
    slug: input.slug,
    publishedAt: fields.status === 'PUBLISHED' ? now : null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}

// O slug fica (links e QR codes já compartilhados); a data de publicação é a
// da primeira vez que o post foi publicado
export function editPost(post: Post, fields: PostFields, now: Date): Post {
  return {
    ...post,
    ...apply(fields),
    publishedAt:
      post.publishedAt ?? (fields.status === 'PUBLISHED' ? now : null),
    updatedAt: now,
  }
}

// Bolsa ou edital com o prazo vencido aparece como encerrado
export const isClosed = (post: Pick<Post, 'type' | 'deadlineAt'>, now: Date) =>
  (post.type === 'SCHOLARSHIP' || post.type === 'CALL') &&
  post.deadlineAt !== null &&
  post.deadlineAt < now

// Data do post em "Próximos prazos"
export function deadlineOf(
  post: Pick<Post, 'type' | 'deadlineAt' | 'startsAt'>,
): Date | null {
  if (post.type === 'SCHOLARSHIP' || post.type === 'CALL') {
    return post.deadlineAt
  }
  return post.type === 'EVENT' ? post.startsAt : null
}

export const unreadSince = (lastSeenAt: Date | null, now: Date) =>
  lastSeenAt ?? new Date(now.getTime() - UNREAD_WINDOW_DAYS * DAY_MS)
