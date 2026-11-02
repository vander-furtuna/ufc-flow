import type { SigaaCourse } from '@ufc-flow/academic-core'

import type { Clock } from '../../../../shared/domain/clock'
import type { IdGenerator } from '../../../../shared/domain/id-generator'
import type { Campus, Course } from '../../domain/course'
import type { Curriculum } from '../../domain/curriculum'
import type {
  AuditEntry,
  CatalogRepositories,
  CatalogUnitOfWork,
  CurriculumImport,
  SigaaCourseRecord,
  SigaaCourseSource,
} from '../../domain/ports'
import type { Subject } from '../../domain/subject'
import { toCurriculumSummary } from '../views'

const clone = <T>(value: T): T => structuredClone(value)

// Implementações em memória das portas, para testar os casos de uso sem
// banco e sem Nest
export class InMemoryCatalog implements CatalogUnitOfWork {
  sigaaCourses = new Map<string, SigaaCourseRecord>()
  campuses = new Map<string, Campus>()
  courses = new Map<string, Course>()
  subjects = new Map<string, Subject>()
  curricula = new Map<string, Curriculum>()
  imports = new Map<string, CurriculumImport>()
  admins = new Set<string>()
  userNames = new Map<string, string>()
  enrollments = new Map<string, number>()
  auditEntries: AuditEntry[] = []

  readonly repositories: CatalogRepositories = {
    sigaaCourses: {
      list: async () => [...this.sigaaCourses.values()],
      find: async (sigaaId) => this.sigaaCourses.get(sigaaId) ?? null,
      sync: async (list, now) => {
        let added = 0
        let removed = 0
        const seen = new Set(list.map((item) => item.sigaaId))
        for (const item of list) {
          const current = this.sigaaCourses.get(item.sigaaId)
          if (!current) added++
          this.sigaaCourses.set(item.sigaaId, {
            ...item,
            firstSeenAt: current?.firstSeenAt ?? now,
            lastSeenAt: now,
            removedAt: null,
          })
        }
        for (const [id, record] of this.sigaaCourses) {
          if (!seen.has(id) && record.removedAt === null) {
            removed++
            this.sigaaCourses.set(id, { ...record, removedAt: now })
          }
        }
        return { added, removed }
      },
    },
    campuses: {
      findById: async (id) => this.campuses.get(id) ?? null,
      findBySlug: async (slug) =>
        [...this.campuses.values()].find((item) => item.slug === slug) ?? null,
      insert: async (campus) => {
        this.campuses.set(campus.id, campus)
      },
    },
    courses: {
      findById: async (id) => this.courses.get(id) ?? null,
      findBySlug: async (slug) =>
        [...this.courses.values()].find((item) => item.slug === slug) ?? null,
      findBySigaaId: async (sigaaId) =>
        [...this.courses.values()].find((item) => item.sigaaId === sigaaId) ??
        null,
      list: async () =>
        [...this.courses.values()].sort((a, b) => a.name.localeCompare(b.name)),
      insert: async (course) => {
        this.courses.set(course.id, course)
      },
      update: async (course) => {
        this.courses.set(course.id, course)
      },
      delete: async (id) => {
        this.courses.delete(id)
        for (const [key, item] of this.curricula) {
          if (item.courseId === id) this.curricula.delete(key)
        }
      },
    },
    subjects: {
      findByCodes: async (codes) =>
        new Map(
          [...this.subjects.values()]
            .filter((item) => codes.includes(item.code))
            .map((item) => [item.code, clone(item)]),
        ),
      findByIds: async (ids) =>
        new Map(
          ids.flatMap((id) => {
            const subject = this.subjects.get(id)
            return subject ? [[id, clone(subject)] as const] : []
          }),
        ),
      insertMany: async (subjects) => {
        for (const subject of subjects) this.subjects.set(subject.id, subject)
      },
      update: async (subject) => {
        this.subjects.set(subject.id, subject)
      },
      usedInPublished: async (subjectId) =>
        [...this.curricula.values()].some(
          (item) =>
            item.status === 'PUBLISHED' &&
            item.subjects.some((link) => link.subjectId === subjectId),
        ),
    },
    curricula: {
      findById: async (id) => {
        const found = this.curricula.get(id)
        return found ? clone(found) : null
      },
      findBySlug: async (courseId, slug) => {
        const found = [...this.curricula.values()].find(
          (item) => item.courseId === courseId && item.header.slug === slug,
        )
        return found ? clone(found) : null
      },
      findByCode: async (courseId, code) => {
        const found = [...this.curricula.values()].find(
          (item) => item.courseId === courseId && item.header.code === code,
        )
        return found ? clone(found) : null
      },
      summaries: async (courseId) =>
        [...this.curricula.values()]
          .filter((item) => item.courseId === courseId)
          .map(toCurriculumSummary),
      save: async (curriculum) => {
        this.curricula.set(curriculum.id, clone(curriculum))
      },
      delete: async (id) => {
        this.curricula.delete(id)
      },
      setCurrent: async (courseId, curriculumId) => {
        for (const [id, item] of this.curricula) {
          if (item.courseId === courseId) {
            this.curricula.set(id, { ...item, isCurrent: id === curriculumId })
          }
        }
      },
    },
    imports: {
      findById: async (id) => {
        const found = this.imports.get(id)
        return found ? clone(found) : null
      },
      insert: async (record) => {
        this.imports.set(record.id, clone(record))
      },
      update: async (record) => {
        this.imports.set(record.id, clone(record))
      },
      list: async ({ status, visibleTo, before, limit }) =>
        [...this.imports.values()]
          .filter((item) => status === null || item.status === status)
          .filter(
            (item) =>
              visibleTo === null ||
              item.importedBy === visibleTo.userId ||
              (item.courseId !== null &&
                visibleTo.courseIds.includes(item.courseId)),
          )
          .sort(
            (a, b) =>
              b.createdAt.getTime() - a.createdAt.getTime() ||
              b.id.localeCompare(a.id),
          )
          .filter(
            (item) =>
              before === null ||
              item.createdAt < before.createdAt ||
              (item.createdAt.getTime() === before.createdAt.getTime() &&
                item.id < before.id),
          )
          .slice(0, limit + 1),
      pendingForCourse: async (sigaaId) =>
        [...this.imports.values()].filter(
          (item) =>
            item.status === 'RECEIVED' &&
            item.courseId === null &&
            item.courseSigaaId === sigaaId,
        ),
      latestApplied: async (curriculumId) =>
        [...this.imports.values()]
          .filter(
            (item) =>
              item.status === 'APPLIED' && item.curriculumId === curriculumId,
          )
          .sort(
            (a, b) =>
              (b.appliedAt?.getTime() ?? 0) - (a.appliedAt?.getTime() ?? 0),
          )[0] ?? null,
    },
    users: {
      isAdmin: async (userId) => this.admins.has(userId),
      names: async (ids) =>
        new Map(
          ids.flatMap((id) => {
            const name = this.userNames.get(id)
            return name ? [[id, name] as const] : []
          }),
        ),
    },
    enrollments: {
      countForCurriculum: async (id) => this.enrollments.get(id) ?? 0,
    },
    audit: {
      record: async (entry) => {
        this.auditEntries.push(entry)
      },
    },
  }

  run<T>(work: (repositories: CatalogRepositories) => Promise<T>): Promise<T> {
    return work(this.repositories)
  }
}

export class FixedSigaaSource implements SigaaCourseSource {
  constructor(public courses: SigaaCourse[]) {}

  fetchAll() {
    return Promise.resolve(this.courses)
  }
}

export class SteppingClock implements Clock {
  private current: Date

  constructor(start: string) {
    this.current = new Date(start)
  }

  // Cada leitura avança um segundo, para ordenar o que foi gravado
  now(): Date {
    const value = this.current
    this.current = new Date(value.getTime() + 1000)
    return value
  }

  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms)
  }
}

export class SequentialIds implements IdGenerator {
  private counter = 0

  next(): string {
    this.counter++
    return `00000000-0000-4000-8000-${String(this.counter).padStart(12, '0')}`
  }
}
