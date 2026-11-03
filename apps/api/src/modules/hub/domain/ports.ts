import type { PostStatus, PostType } from '@ufc-flow/contracts'

import type { CursorPosition } from '../../../shared/domain/cursor'
import type { FileAttachmentRepository } from '../../files/domain/ports'
import type { Post } from './post'

// Post com o nome de quem escreveu, para as telas
export type PostRow = Post & { authorName: string | null }

export type FeedFilter = {
  courseId: string
  type?: PostType
  // Eventos que ainda não terminaram
  upcoming?: boolean
  q?: string
  status: PostStatus
  // Rascunhos e arquivados institucionais só aparecem para admin
  includeInstitutional: boolean
  now: Date
}

export interface PostRepository {
  findById(id: string): Promise<Post | null>
  // Post do curso ou, com courseId nulo, institucional
  findBySlug(courseId: string | null, slug: string): Promise<Post | null>
  // Slugs já usados no curso que começam com a base, para não repetir
  slugsLike(courseId: string | null, base: string): Promise<Set<string>>
  // Grava o post inteiro, com a galeria
  save(post: Post): Promise<void>
}

export interface HubReader {
  // Fixados publicados (só na primeira página do feed)
  pinned(filter: FeedFilter): Promise<PostRow[]>
  // Os demais, por data de publicação (ou criação, nos rascunhos), mais um
  // além do limite para saber se há próxima página
  page(
    filter: FeedFilter,
    after: CursorPosition | null,
    limit: number,
  ): Promise<PostRow[]>
  findRow(id: string): Promise<PostRow | null>
  // Bolsas e editais abertos e eventos que não começaram, do mais próximo
  deadlines(courseId: string, now: Date, limit: number): Promise<Post[]>
  unreadCount(courseId: string, since: Date): Promise<number>
}

export interface HubReadRepository {
  lastSeen(userId: string, courseId: string): Promise<Date | null>
  touch(userId: string, courseId: string, at: Date): Promise<void>
}

export interface HubCourses {
  findBySlug(slug: string): Promise<{ id: string; isActive: boolean } | null>
}

export type HubRepositories = {
  posts: PostRepository
  reader: HubReader
  reads: HubReadRepository
  courses: HubCourses
  files: FileAttachmentRepository
}

export interface HubUnitOfWork {
  run<T>(work: (repositories: HubRepositories) => Promise<T>): Promise<T>
}

export const HUB_UOW = Symbol('HubUnitOfWork')
