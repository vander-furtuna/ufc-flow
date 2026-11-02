import type { Instructor, ScheduleView } from '@ufc-flow/contracts'

import type {
  PlanningRepositories,
  PlanningUnitOfWork,
} from '../../domain/ports'
import type { Schedule, SectionSnapshot } from '../../domain/schedule'

export type StoredSection = SectionSnapshot & {
  subjectName: string
  instructors: Instructor[]
  validFrom: string | null
  validTo: string | null
}

type Course = { id: string; slug: string; isActive: boolean }
type Curriculum = {
  id: string
  courseId: string
  slug: string
  published: boolean
}
type Term = { id: string; code: string }

const clone = <T>(value: T): T => structuredClone(value)

// Portas em memória, para testar os casos de uso sem banco
export class InMemoryPlanning implements PlanningUnitOfWork {
  schedules = new Map<string, Schedule>()
  sections = new Map<string, StoredSection>()
  courses: Course[] = []
  curricula: Curriculum[] = []
  terms: Term[] = []

  private toView(schedule: Schedule): ScheduleView {
    const course = this.courses.find((item) => item.id === schedule.courseId)!
    const curriculum = this.curricula.find(
      (item) => item.id === schedule.curriculumId,
    )!
    const term = this.terms.find((item) => item.id === schedule.termId)!
    return {
      id: schedule.id,
      courseSlug: course.slug,
      curriculumSlug: curriculum.slug,
      term: term.code,
      name: schedule.name,
      position: schedule.position,
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
      items: schedule.items.map((item) => {
        const section = this.sections.get(item.sectionId)!
        return {
          sectionId: section.id,
          subjectCode: section.subjectCode,
          subjectName: section.subjectName,
          sectionCode: section.sectionCode,
          color: item.color,
          instructors: section.instructors,
          slots: section.slots,
          validFrom: section.validFrom,
          validTo: section.validTo,
          addedAt: item.addedAt.toISOString(),
          changed: item.slotsFingerprint !== section.fingerprint,
          removed: section.removed,
        }
      }),
    }
  }

  readonly repositories: PlanningRepositories = {
    schedules: {
      findById: async (id) => clone(this.schedules.get(id) ?? null),
      save: async (schedule) => {
        this.schedules.set(schedule.id, clone(schedule))
      },
      delete: async (id) => {
        this.schedules.delete(id)
      },
    },
    reader: {
      list: async (userId, filter) =>
        [...this.schedules.values()]
          .filter(
            (item) =>
              item.userId === userId &&
              (!filter.courseId || item.courseId === filter.courseId) &&
              (!filter.curriculumId ||
                item.curriculumId === filter.curriculumId) &&
              (!filter.termId || item.termId === filter.termId),
          )
          .sort(
            (a, b) =>
              a.position - b.position ||
              a.createdAt.getTime() - b.createdAt.getTime(),
          )
          .map((item) => this.toView(item)),
      get: async (id) => {
        const schedule = this.schedules.get(id)
        return schedule ? this.toView(schedule) : null
      },
    },
    context: {
      findCourse: async (slug) =>
        this.courses.find((item) => item.slug === slug) ?? null,
      findPublishedCurriculum: async (courseId, slug) =>
        this.curricula.find(
          (item) =>
            item.courseId === courseId && item.slug === slug && item.published,
        ) ?? null,
      findTerm: async (code) =>
        this.terms.find((item) => item.code === code) ?? null,
    },
    sections: {
      byIds: async (ids) =>
        ids.flatMap((id) => {
          const section = this.sections.get(id)
          return section ? [clone(section)] : []
        }),
      byKeys: async (termId, keys) =>
        [...this.sections.values()]
          .filter(
            (section) =>
              section.termId === termId &&
              keys.some(
                (key) =>
                  key.subjectCode === section.subjectCode &&
                  key.sectionCode === section.sectionCode,
              ),
          )
          .map(clone),
    },
  }

  run<T>(work: (repositories: PlanningRepositories) => Promise<T>) {
    return work(this.repositories)
  }
}
