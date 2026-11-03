import { normalizeSearchText } from '@ufc-flow/academic-core'

import type { FileRecord } from '../../../files/domain/file'
import type {
  FeedFilter,
  HubRepositories,
  HubUnitOfWork,
  PostRow,
} from '../../domain/ports'
import { deadlineOf, type Post } from '../../domain/post'

const clone = <T>(value: T): T => structuredClone(value)

const sortAt = (post: Post) => post.publishedAt ?? post.createdAt

// Portas em memória, com a mesma ordem e os mesmos filtros do SQL
export class InMemoryHub implements HubUnitOfWork {
  posts = new Map<string, Post>()
  reads = new Map<string, Date>()
  files = new Map<string, FileRecord>()
  courses: { id: string; slug: string; isActive: boolean }[] = []
  names = new Map<string, string>()

  private row(post: Post): PostRow {
    return {
      ...clone(post),
      authorName: post.authorId
        ? (this.names.get(post.authorId) ?? null)
        : null,
    }
  }

  private matches(post: Post, filter: FeedFilter) {
    if (post.deletedAt || post.status !== filter.status) return false
    if (post.courseId !== filter.courseId) {
      if (post.courseId !== null || !filter.includeInstitutional) return false
    }
    if (filter.type && post.type !== filter.type) return false
    if (filter.upcoming) {
      const end = post.endsAt ?? post.startsAt
      if (post.type !== 'EVENT' || !end || end < filter.now) return false
    }
    if (filter.q) {
      const text = normalizeSearchText(`${post.title} ${post.summary ?? ''}`)
      if (!text.includes(filter.q)) return false
    }
    return true
  }

  private visible(courseId: string) {
    return [...this.posts.values()].filter(
      (post) =>
        !post.deletedAt &&
        post.status === 'PUBLISHED' &&
        (post.courseId === courseId || post.courseId === null),
    )
  }

  repositories(): HubRepositories {
    return {
      posts: {
        findById: async (id) => clone(this.posts.get(id) ?? null),
        findBySlug: async (courseId, slug) =>
          clone(
            [...this.posts.values()].find(
              (post) => post.courseId === courseId && post.slug === slug,
            ) ?? null,
          ),
        slugsLike: async (courseId, base) =>
          new Set(
            [...this.posts.values()]
              .filter(
                (post) =>
                  post.courseId === courseId && post.slug.startsWith(base),
              )
              .map((post) => post.slug),
          ),
        save: async (post) => {
          this.posts.set(post.id, clone(post))
        },
      },
      reader: {
        pinned: async (filter) =>
          [...this.posts.values()]
            .filter((post) => post.pinned && this.matches(post, filter))
            .sort((a, b) => sortAt(b).getTime() - sortAt(a).getTime())
            .map((post) => this.row(post)),
        page: async (filter, after, limit) =>
          [...this.posts.values()]
            .filter(
              (post) =>
                this.matches(post, filter) &&
                (filter.status !== 'PUBLISHED' || !post.pinned),
            )
            .sort(
              (a, b) =>
                sortAt(b).getTime() - sortAt(a).getTime() ||
                b.id.localeCompare(a.id),
            )
            .filter(
              (post) =>
                !after ||
                sortAt(post) < after.createdAt ||
                (sortAt(post).getTime() === after.createdAt.getTime() &&
                  post.id < after.id),
            )
            .slice(0, limit + 1)
            .map((post) => this.row(post)),
        findRow: async (id) => {
          const post = this.posts.get(id)
          return post ? this.row(post) : null
        },
        deadlines: async (courseId, now, limit) =>
          clone(
            this.visible(courseId)
              .filter((post) => {
                const at = deadlineOf(post)
                return at !== null && at >= now
              })
              .sort(
                (a, b) => deadlineOf(a)!.getTime() - deadlineOf(b)!.getTime(),
              )
              .slice(0, limit),
          ),
        unreadCount: async (courseId, since) =>
          this.visible(courseId).filter(
            (post) => post.publishedAt && post.publishedAt > since,
          ).length,
      },
      reads: {
        lastSeen: async (userId, courseId) =>
          this.reads.get(`${userId}|${courseId}`) ?? null,
        touch: async (userId, courseId, at) => {
          this.reads.set(`${userId}|${courseId}`, at)
        },
      },
      courses: {
        findBySlug: async (slug) =>
          this.courses.find((course) => course.slug === slug) ?? null,
      },
      files: {
        findById: async (id) => clone(this.files.get(id) ?? null),
        save: async (file) => {
          this.files.set(file.id, clone(file))
        },
      },
    }
  }

  run<T>(work: (repositories: HubRepositories) => Promise<T>) {
    return work(this.repositories())
  }
}
