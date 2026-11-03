import { normalizeSearchText } from '@ufc-flow/academic-core'

import type { CursorPosition } from '../../../../shared/domain/cursor'
import { visibilityOf, type Message, type Viewer } from '../../domain/message'
import type {
  ForumCourse,
  ForumRepositories,
  ForumUnitOfWork,
  MessageRow,
} from '../../domain/ports'

type Subject = {
  id: string
  code: string
  name: string
  slug: string
  // Período na EC vigente do curso (null = fora dela)
  semesterIn?: Record<string, number>
}

const clone = <T>(value: T): T => structuredClone(value)

const newer = (a: Message, b: Message) =>
  b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id)
const older = (a: Message, b: Message) => -newer(a, b)

const afterDesc = (message: Message, after: CursorPosition | null) =>
  !after ||
  message.createdAt < after.createdAt ||
  (message.createdAt.getTime() === after.createdAt.getTime() &&
    message.id < after.id)
const afterAsc = (message: Message, after: CursorPosition | null) =>
  !after ||
  message.createdAt > after.createdAt ||
  (message.createdAt.getTime() === after.createdAt.getTime() &&
    message.id > after.id)

// Portas em memória, com a mesma ordem e os mesmos filtros do SQL
export class InMemoryForum implements ForumUnitOfWork {
  messages = new Map<string, Message>()
  mentions = new Map<string, string[]>()
  likes = new Set<string>()
  courses: ForumCourse[] = []
  subjects: Subject[] = []
  names = new Map<string, string>()

  private row(message: Message, viewerId: string | null): MessageRow {
    const parent = message.parentId
      ? this.messages.get(message.parentId)
      : undefined
    return {
      ...clone(message),
      authorName: message.authorId
        ? (this.names.get(message.authorId) ?? null)
        : null,
      authorAvatarFileId: null,
      parentAuthorName: parent?.authorId
        ? (this.names.get(parent.authorId) ?? null)
        : null,
      likedByMe:
        viewerId !== null && this.likes.has(`${message.id}|${viewerId}`),
      mentions: (this.mentions.get(message.id) ?? []).map((id) => {
        const subject = this.subjects.find((item) => item.id === id)!
        return { code: subject.code, name: subject.name, slug: subject.slug }
      }),
    }
  }

  private list() {
    return [...this.messages.values()]
  }

  repositories(): ForumRepositories {
    return {
      messages: {
        findById: async (id) => clone(this.messages.get(id) ?? null),
        save: async (message, subjectIds) => {
          this.messages.set(message.id, clone(message))
          this.mentions.set(message.id, [...subjectIds])
        },
        delete: async (id) => {
          this.messages.delete(id)
          this.mentions.delete(id)
          for (const key of [...this.likes]) {
            if (key.startsWith(`${id}|`)) this.likes.delete(key)
          }
        },
        addReplies: async (id, delta) => {
          const message = this.messages.get(id)!
          message.replyCount += delta
        },
        addLikes: async (id, delta) => {
          const message = this.messages.get(id)!
          message.likeCount += delta
          return message.likeCount
        },
        countByAuthorSince: async (authorId, since) =>
          this.list().filter(
            (message) =>
              message.authorId === authorId && message.createdAt >= since,
          ).length,
      },
      likes: {
        add: async (messageId, userId) => {
          const key = `${messageId}|${userId}`
          if (this.likes.has(key)) return false
          this.likes.add(key)
          return true
        },
        remove: async (messageId, userId) =>
          this.likes.delete(`${messageId}|${userId}`),
      },
      reader: {
        rows: async (ids, viewerId) =>
          ids.flatMap((id) => {
            const message = this.messages.get(id)
            return message ? [this.row(message, viewerId)] : []
          }),
        timeline: async (courseId, viewer, after, limit) =>
          this.list()
            .filter(
              (message) =>
                message.courseId === courseId &&
                message.parentId === null &&
                this.inTimeline(message, viewer) &&
                afterDesc(message, after),
            )
            .sort(newer)
            .slice(0, limit + 1)
            .map((message) => this.row(message, viewer.userId)),
        countNewRoots: async (courseId, since, viewerId) =>
          this.list().filter(
            (message) =>
              message.courseId === courseId &&
              message.parentId === null &&
              message.status === 'VISIBLE' &&
              message.authorId !== viewerId &&
              message.createdAt > since,
          ).length,
        replies: async (parentId, viewer, after, limit) =>
          this.list()
            .filter(
              (message) =>
                message.parentId === parentId &&
                visibilityOf(message, viewer) !== 'NONE' &&
                afterAsc(message, after),
            )
            .sort(older)
            .slice(0, limit + 1)
            .map((message) => this.row(message, viewer.userId)),
        bySubject: async (courseId, subjectId, viewerId, after, limit) =>
          this.list()
            .filter(
              (message) =>
                message.courseId === courseId &&
                message.status === 'VISIBLE' &&
                (this.mentions.get(message.id) ?? []).includes(subjectId) &&
                afterDesc(message, after),
            )
            .sort(newer)
            .slice(0, limit + 1)
            .map((message) => this.row(message, viewerId)),
        threadAuthors: async (rootId) => [
          ...new Set(
            this.list()
              .filter(
                (message) => message.id === rootId || message.rootId === rootId,
              )
              .map((message) => message.authorId)
              .filter((id): id is string => id !== null),
          ),
        ],
        trendingSubjects: async (courseId, since, limit) => {
          const counts = new Map<string, number>()
          for (const message of this.list()) {
            if (
              message.courseId !== courseId ||
              message.status !== 'VISIBLE' ||
              message.createdAt < since
            ) {
              continue
            }
            for (const id of this.mentions.get(message.id) ?? []) {
              counts.set(id, (counts.get(id) ?? 0) + 1)
            }
          }
          return [...counts]
            .map(([id, count]) => {
              const subject = this.subjects.find((item) => item.id === id)!
              return {
                code: subject.code,
                name: subject.name,
                slug: subject.slug,
                count,
              }
            })
            .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
            .slice(0, limit)
        },
      },
      catalog: {
        course: async (slug) =>
          this.courses.find((course) => course.slug === slug) ?? null,
        courseById: async (id) =>
          this.courses.find((course) => course.id === id) ?? null,
        subjectsByCode: async (codes) =>
          this.subjects
            .filter((subject) => codes.includes(subject.code))
            .map(({ id, code }) => ({ id, code })),
        subjectByCode: async (code) => {
          const subject = this.subjects.find((item) => item.code === code)
          return subject ? { id: subject.id } : null
        },
        searchSubjects: async (courseId, query, limit) =>
          this.subjects
            .filter(
              (subject) =>
                subject.code.toLowerCase().startsWith(query) ||
                normalizeSearchText(subject.name).includes(query),
            )
            .map((subject) => {
              const semester = subject.semesterIn?.[courseId] ?? null
              return {
                code: subject.code,
                name: subject.name,
                slug: subject.slug,
                inCurriculum: semester !== null,
                semester,
                nature: semester !== null ? ('MANDATORY' as const) : null,
                courseName: semester !== null ? null : 'Outro curso',
              }
            })
            .sort(
              (a, b) =>
                Number(b.inCurriculum) - Number(a.inCurriculum) ||
                a.name.localeCompare(b.name),
            )
            .slice(0, limit),
      },
    }
  }

  // Raízes que aparecem na timeline: as visíveis, as que o leitor pode ver
  // e as tiradas do ar que ainda têm respostas (viram aviso)
  private inTimeline(message: Message, viewer: Viewer) {
    if (message.status === 'VISIBLE') return true
    if (message.replyCount > 0) return true
    return (
      message.status === 'HIDDEN' && visibilityOf(message, viewer) === 'FULL'
    )
  }

  run<T>(work: (repositories: ForumRepositories) => Promise<T>): Promise<T> {
    return work(this.repositories())
  }
}
