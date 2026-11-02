import type { FileRecord } from '../../../files/domain/file'
import type { Activity, ActivityCategory } from '../../domain/activity'
import type { StoredRecord } from '../../domain/academic-record'
import type { Enrollment } from '../../domain/enrollment'
import type {
  AcademicRecordRepositories,
  AcademicRecordUnitOfWork,
  AuditEntry,
  CourseInfo,
  CurriculumInfo,
  CurriculumSnapshot,
  SubjectInfo,
} from '../../domain/ports'

const clone = <T>(value: T): T => structuredClone(value)

export const emptySnapshot = (): CurriculumSnapshot => ({
  mandatoryHours: 0,
  optativeHours: 0,
  maxFreeOptativeHours: 0,
  extensionHours: 0,
  minTotalHours: 0,
  minEmphases: null,
  maxEmphases: null,
  periodAvgHours: null,
  subjects: [],
  branches: [],
  equivalences: new Map(),
})

// Portas em memória, para testar os casos de uso sem banco
export class InMemoryAcademicRecord implements AcademicRecordUnitOfWork {
  enrollments = new Map<string, Enrollment>()
  records = new Map<string, StoredRecord>()
  activities = new Map<string, Activity>()
  categories = new Map<string, ActivityCategory>()
  files = new Map<string, FileRecord>()
  audit: AuditEntry[] = []
  courses: CourseInfo[] = []
  curricula: CurriculumInfo[] = []
  subjects: SubjectInfo[] = []
  snapshots = new Map<string, CurriculumSnapshot>()
  term: { code: string; endsAt: string } | null = null

  repositories(): AcademicRecordRepositories {
    return {
      enrollments: {
        findById: async (id) => clone(this.enrollments.get(id) ?? null),
        findCurrent: async (userId) =>
          clone(
            [...this.enrollments.values()].find(
              (item) => item.userId === userId && item.isCurrent,
            ) ?? null,
          ),
        listByUser: async (userId) =>
          clone(
            [...this.enrollments.values()]
              .filter((item) => item.userId === userId)
              .sort(
                (a, b) =>
                  Number(b.isCurrent) - Number(a.isCurrent) ||
                  b.createdAt.getTime() - a.createdAt.getTime(),
              ),
          ),
        save: async (enrollment) => {
          if (
            enrollment.isCurrent &&
            [...this.enrollments.values()].some(
              (item) =>
                item.userId === enrollment.userId &&
                item.isCurrent &&
                item.id !== enrollment.id,
            )
          ) {
            throw new Error('student_enrollments_one_current')
          }
          this.enrollments.set(enrollment.id, clone(enrollment))
        },
      },
      records: {
        findById: async (id) => clone(this.records.get(id) ?? null),
        listByEnrollment: async (enrollmentId) =>
          clone(
            [...this.records.values()].filter(
              (item) => item.enrollmentId === enrollmentId,
            ),
          ),
        insert: async (record) => {
          this.records.set(record.id, clone(record))
        },
        update: async (record) => {
          this.records.set(record.id, clone(record))
        },
        delete: async (id) => {
          this.records.delete(id)
          for (const record of this.records.values()) {
            if (record.sourceRecordId === id) record.sourceRecordId = null
          }
        },
      },
      activities: {
        findById: async (id) => clone(this.activities.get(id) ?? null),
        listByEnrollment: async (enrollmentId) =>
          clone(
            [...this.activities.values()].filter(
              (item) => item.enrollmentId === enrollmentId,
            ),
          ),
        save: async (activity) => {
          this.activities.set(activity.id, clone(activity))
        },
        delete: async (id) => {
          this.activities.delete(id)
        },
        clearCategoriesOutside: async (enrollmentId, curriculumId) => {
          for (const activity of this.activities.values()) {
            if (activity.enrollmentId !== enrollmentId || !activity.categoryId)
              continue
            const category = this.categories.get(activity.categoryId)
            if (category?.curriculumId !== curriculumId) {
              activity.categoryId = null
            }
          }
        },
      },
      categories: {
        findById: async (id) => clone(this.categories.get(id) ?? null),
        listByCurriculum: async (curriculumId) =>
          clone(
            [...this.categories.values()]
              .filter((item) => item.curriculumId === curriculumId)
              .sort((a, b) => a.position - b.position),
          ),
        save: async (category) => {
          this.categories.set(category.id, clone(category))
        },
        delete: async (id) => {
          this.categories.delete(id)
          for (const activity of this.activities.values()) {
            if (activity.categoryId === id) activity.categoryId = null
          }
        },
      },
      catalog: {
        findCourse: async (slug) =>
          this.courses.find((item) => item.slug === slug) ?? null,
        findCourseById: async (id) =>
          this.courses.find((item) => item.id === id) ?? null,
        findCurriculum: async (courseId, slug) =>
          this.curricula.find(
            (item) => item.courseId === courseId && item.slug === slug,
          ) ?? null,
        findCurriculumById: async (id) =>
          this.curricula.find((item) => item.id === id) ?? null,
        subjectsByCodes: async (codes) =>
          this.subjects.filter((item) => codes.includes(item.code)),
        subjectsByIds: async (ids) =>
          this.subjects.filter((item) => ids.includes(item.id)),
        currentTerm: async () => this.term,
        snapshot: async (curriculumId) =>
          this.snapshots.get(curriculumId) ?? emptySnapshot(),
      },
      files: {
        findById: async (id) => clone(this.files.get(id) ?? null),
        save: async (file) => {
          this.files.set(file.id, clone(file))
        },
      },
      audit: {
        record: async (entry) => {
          this.audit.push(entry)
        },
      },
    }
  }

  run<T>(work: (repositories: AcademicRecordRepositories) => Promise<T>) {
    return work(this.repositories())
  }
}
