import type {
  MessageMention,
  SubjectSearchResult,
  TrendingSubject,
} from '@ufc-flow/contracts'

import type { CursorPosition } from '../../../shared/domain/cursor'
import type { Message, RateLimits, Viewer } from './message'

// Mensagem com o que a tela precisa: autor, a quem responde, curtida de quem
// lê e as disciplinas citadas
export type MessageRow = Message & {
  authorName: string | null
  authorAvatarFileId: string | null
  parentAuthorName: string | null
  likedByMe: boolean
  mentions: MessageMention[]
}

export type ForumCourse = {
  id: string
  slug: string
  name: string
  isActive: boolean
}

export interface MessageRepository {
  findById(id: string): Promise<Message | null>
  // Grava a mensagem e troca as menções (ids das disciplinas)
  save(message: Message, mentionSubjectIds: readonly string[]): Promise<void>
  delete(id: string): Promise<void>
  // Contadores na mesma transação da resposta ou curtida
  addReplies(id: string, delta: number): Promise<void>
  addLikes(id: string, delta: number): Promise<number>
  // Mensagens da pessoa desde um instante (limite de envio)
  countByAuthorSince(authorId: string, since: Date): Promise<number>
}

export interface LikeRepository {
  // true quando a curtida é nova (ou saiu de fato)
  add(messageId: string, userId: string, at: Date): Promise<boolean>
  remove(messageId: string, userId: string): Promise<boolean>
}

export interface ForumReader {
  rows(ids: readonly string[], viewerId: string | null): Promise<MessageRow[]>
  // Mensagens raiz, das mais novas para as mais antigas; uma a mais que o
  // limite para saber se há próxima página
  timeline(
    courseId: string,
    viewer: Viewer,
    after: CursorPosition | null,
    limit: number,
  ): Promise<MessageRow[]>
  // Raízes visíveis de outras pessoas publicadas depois do instante
  countNewRoots(
    courseId: string,
    since: Date,
    viewerId: string | null,
  ): Promise<number>
  // Respostas diretas, das mais antigas para as mais novas
  replies(
    parentId: string,
    viewer: Viewer,
    after: CursorPosition | null,
    limit: number,
  ): Promise<MessageRow[]>
  // Mensagens visíveis do curso que citam a disciplina, das mais novas
  bySubject(
    courseId: string,
    subjectId: string,
    viewerId: string | null,
    after: CursorPosition | null,
    limit: number,
  ): Promise<MessageRow[]>
  // Quem já escreveu na conversa (a raiz e as respostas)
  threadAuthors(rootId: string): Promise<string[]>
  trendingSubjects(
    courseId: string,
    since: Date,
    limit: number,
  ): Promise<TrendingSubject[]>
}

export interface ForumCatalog {
  course(slug: string): Promise<ForumCourse | null>
  courseById(id: string): Promise<ForumCourse | null>
  // Códigos que existem no catálogo, com o id da disciplina
  subjectsByCode(
    codes: readonly string[],
  ): Promise<{ id: string; code: string }[]>
  subjectByCode(code: string): Promise<{ id: string } | null>
  // EC vigente do curso primeiro, depois o resto do catálogo
  searchSubjects(
    courseId: string,
    normalizedQuery: string,
    limit: number,
  ): Promise<SubjectSearchResult[]>
}

export type ForumRepositories = {
  messages: MessageRepository
  likes: LikeRepository
  reader: ForumReader
  catalog: ForumCatalog
}

export interface ForumUnitOfWork {
  run<T>(work: (repositories: ForumRepositories) => Promise<T>): Promise<T>
}

export const FORUM_UOW = Symbol('ForumUnitOfWork')
export const FORUM_RATE_LIMITS = Symbol('ForumRateLimits')
export type { RateLimits }
