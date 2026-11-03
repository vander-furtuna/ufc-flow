import type { LinkTrafficSource } from '@ufc-flow/contracts'

import type { FileRecord } from '../../../files/domain/file'
import type {
  CourseLink,
  LinkPage,
  LinkSection,
  SocialLink,
} from '../../domain/link-page'
import type {
  LinkCourse,
  LinkedPost,
  LinkPageRepositories,
  LinkPageUnitOfWork,
} from '../../domain/ports'

const clone = <T>(value: T): T => structuredClone(value)

// Portas em memória, para testar os casos de uso sem banco
export class InMemoryLinkPage implements LinkPageUnitOfWork {
  pages = new Map<string, LinkPage>()
  sections = new Map<string, LinkSection>()
  links = new Map<string, CourseLink>()
  socials = new Map<string, SocialLink>()
  clicks: {
    linkId: string
    day: string
    source: LinkTrafficSource
    clicks: number
  }[] = []
  views: {
    courseId: string
    day: string
    source: LinkTrafficSource
    views: number
  }[] = []
  courses: LinkCourse[] = []
  curricula = new Map<string, string>()
  posts: LinkedPost[] = []
  files = new Map<string, FileRecord>()

  private ofCourse<T extends { courseId: string }>(
    map: Map<string, T>,
    courseId: string,
  ) {
    return clone([...map.values()].filter((item) => item.courseId === courseId))
  }

  repositories(): LinkPageRepositories {
    return {
      pages: {
        findByCourse: async (courseId) =>
          clone(this.pages.get(courseId) ?? null),
        findBySlug: async (slug) =>
          clone(
            [...this.pages.values()].find((page) => page.slug === slug) ?? null,
          ),
        slugsLike: async (base) =>
          new Set(
            [...this.pages.values()]
              .map((page) => page.slug)
              .filter((slug) => slug.startsWith(base)),
          ),
        save: async (page) => {
          this.pages.set(page.courseId, clone(page))
        },
      },
      sections: {
        list: async (courseId) => this.ofCourse(this.sections, courseId),
        save: async (section) => {
          this.sections.set(section.id, clone(section))
        },
        delete: async (id) => {
          this.sections.delete(id)
          for (const link of this.links.values()) {
            if (link.sectionId === id) link.sectionId = null
          }
        },
      },
      links: {
        list: async (courseId) => this.ofCourse(this.links, courseId),
        save: async (link) => {
          this.links.set(link.id, clone(link))
        },
        delete: async (id) => {
          this.links.delete(id)
        },
      },
      socialLinks: {
        list: async (courseId) => this.ofCourse(this.socials, courseId),
        save: async (social) => {
          this.socials.set(social.id, clone(social))
        },
        delete: async (id) => {
          this.socials.delete(id)
        },
      },
      stats: {
        addClick: async (linkId, day, source) => {
          const row = this.clicks.find(
            (item) =>
              item.linkId === linkId &&
              item.day === day &&
              item.source === source,
          )
          if (row) row.clicks++
          else this.clicks.push({ linkId, day, source, clicks: 1 })
        },
        addView: async (courseId, day, source) => {
          const row = this.views.find(
            (item) =>
              item.courseId === courseId &&
              item.day === day &&
              item.source === source,
          )
          if (row) row.views++
          else this.views.push({ courseId, day, source, views: 1 })
        },
        clicksSince: async (courseId, day) => {
          const ids = new Set(
            [...this.links.values()]
              .filter((link) => link.courseId === courseId)
              .map((link) => link.id),
          )
          return clone(
            this.clicks.filter((row) => ids.has(row.linkId) && row.day >= day),
          )
        },
        viewsSince: async (courseId, day) =>
          clone(
            this.views
              .filter((row) => row.courseId === courseId && row.day >= day)
              .map(({ courseId: _course, ...row }) => row),
          ),
      },
      context: {
        findCourse: async (slug) =>
          this.courses.find((course) => course.slug === slug) ?? null,
        findCourseById: async (id) =>
          this.courses.find((course) => course.id === id) ?? null,
        currentCurriculumSlug: async (courseId) =>
          this.curricula.get(courseId) ?? null,
        findPosts: async (ids) =>
          this.posts.filter((post) => ids.includes(post.id)),
        fileMimes: async (ids) =>
          new Map(
            ids.flatMap((id) => {
              const file = this.files.get(id)
              return file ? [[id, file.mimeType] as const] : []
            }),
          ),
      },
      files: {
        findById: async (id) => clone(this.files.get(id) ?? null),
        save: async (file) => {
          this.files.set(file.id, clone(file))
        },
      },
    }
  }

  run<T>(work: (repositories: LinkPageRepositories) => Promise<T>) {
    return work(this.repositories())
  }
}
