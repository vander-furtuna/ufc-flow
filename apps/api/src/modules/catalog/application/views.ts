import type {
  CourseDetail,
  CurriculumDetail,
  CurriculumImportV1,
  CurriculumImportView,
  CurriculumSummary,
  ReviewPoint as ReviewPointView,
  SigaaCourseEntry,
  SubjectView,
} from '@ufc-flow/contracts'

import type { Campus, Course } from '../domain/course'
import type { Curriculum } from '../domain/curriculum'
import type { CurriculumImport, SigaaCourseRecord } from '../domain/ports'
import type { ReviewPoint } from '../domain/review-points'
import { subjectWorkload, type Subject } from '../domain/subject'

const iso = (date: Date | null) => (date ? date.toISOString() : null)

export const toCurriculumSummary = (c: Curriculum): CurriculumSummary => ({
  id: c.id,
  slug: c.header.slug,
  code: c.header.code,
  effectiveTerm: c.header.effectiveTerm,
  status: c.status,
  isCurrent: c.isCurrent,
  needsReimport: c.needsReimport,
  publishedAt: iso(c.publishedAt),
  updatedAt: c.updatedAt.toISOString(),
})

export const toCourseDetail = (
  course: Course,
  campus: Campus,
  curricula: CurriculumSummary[],
): CourseDetail => ({
  id: course.id,
  sigaaId: course.sigaaId,
  slug: course.slug,
  name: course.name,
  icon: course.icon,
  color: course.color,
  isActive: course.isActive,
  campus,
  curricula,
})

export const toSubjectView = (subject: Subject): SubjectView => ({
  id: subject.id,
  code: subject.code,
  name: subject.name,
  type: subject.type,
  durationTerms: subject.durationTerms,
  ...subjectWorkload(subject),
  equivalences: subject.equivalences,
})

export function toCurriculumDetail(
  c: Curriculum,
  course: Course,
  subjects: ReadonlyMap<string, Subject>,
): CurriculumDetail {
  return {
    ...toCurriculumSummary(c),
    course: { id: course.id, slug: course.slug, name: course.name },
    header: c.header,
    branches: [...c.branches].sort((a, b) => a.position - b.position),
    subjects: c.subjects.map((item) => {
      const subject = subjects.get(item.subjectId) as Subject
      return {
        subjectId: subject.id,
        code: subject.code,
        name: subject.name,
        type: subject.type,
        durationTerms: subject.durationTerms,
        ...subjectWorkload(subject),
        semester: item.semester,
        nature: item.nature,
        prerequisites: item.prerequisites,
        corequisites: item.corequisites,
        equivalences: subject.equivalences,
        branches: item.branches,
      }
    }),
  }
}

export const toReviewPointView = (point: ReviewPoint): ReviewPointView =>
  ({ ...point, resolvedAt: iso(point.resolvedAt) }) as ReviewPointView

export function toImportView(
  record: CurriculumImport,
  course: Course | null,
  names: ReadonlyMap<string, string>,
): CurriculumImportView {
  const pendingReason =
    record.status !== 'RECEIVED'
      ? null
      : record.courseId === null
        ? 'COURSE_MISSING'
        : 'DIFF_REVIEW'
  return {
    id: record.id,
    status: record.status,
    source: record.source,
    pendingReason,
    course: {
      sigaaId: record.courseSigaaId,
      name: record.payload.course.name,
      id: course?.id ?? null,
      slug: course?.slug ?? null,
    },
    curriculum: {
      code: record.payload.curriculum.code,
      id: record.curriculumId,
    },
    subjectCount: record.payload.subjects.length,
    reviewPointCount: record.reviewPoints.filter(
      (point) => point.resolution === null,
    ).length,
    importedBy: record.importedBy
      ? {
          id: record.importedBy,
          name: names.get(record.importedBy) ?? 'Conta removida',
        }
      : null,
    createdAt: record.createdAt.toISOString(),
    appliedAt: iso(record.appliedAt),
  }
}

export const toSigaaCourseEntry = (
  record: SigaaCourseRecord,
  flowCourseId: string | null,
): SigaaCourseEntry => ({
  sigaaCourse: {
    sigaaId: record.sigaaId,
    name: record.name,
    city: record.city,
    modality: record.modality,
    unitAcronym: record.unitAcronym,
    unitName: record.unitName,
  },
  flowCourseId,
  removed: record.removedAt !== null,
})

// EC no formato de importação, para exportar ou reimportar em outro lugar
export function exportCurriculum(
  c: Curriculum,
  ctx: {
    course: Course
    campus: Campus
    sigaaCourseName: string | null
    subjects: ReadonlyMap<string, Subject>
    now: Date
  },
): CurriculumImportV1 {
  const keyOf = new Map(
    c.branches.map((branch, index) => [branch.id, `branch-${index + 1}`]),
  )
  const key = (id: string) => keyOf.get(id) as string
  const { slug: _, ...header } = c.header
  return {
    schemaVersion: 1,
    source: { extractedAt: ctx.now.toISOString(), url: null },
    course: {
      sigaaId: ctx.course.sigaaId,
      name: ctx.sigaaCourseName ?? ctx.course.name.toUpperCase(),
      recognition: 'MANUAL',
    },
    curriculum: {
      ...header,
      city: `${ctx.campus.city.toUpperCase()} - ${ctx.campus.state}`,
    },
    branches: [...c.branches]
      .sort((a, b) => a.position - b.position)
      .map(({ id, parentId, position: __, ...branch }) => ({
        key: key(id),
        parentKey: parentId === null ? null : key(parentId),
        ...branch,
      })),
    subjects: c.subjects.map((item) => {
      const subject = ctx.subjects.get(item.subjectId) as Subject
      return {
        code: subject.code,
        name: subject.name,
        type: subject.type,
        semester: item.semester,
        durationTerms: subject.durationTerms,
        ...subjectWorkload(subject),
        nature: item.nature,
        prerequisites: item.prerequisites,
        corequisites: item.corequisites,
        equivalences: subject.equivalences,
        branches: item.branches.map((link) => ({
          key: key(link.branchId),
          nature: link.nature,
        })),
      }
    }),
  }
}
