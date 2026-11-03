import type {
  ActivityCategoryView,
  ActivityRecordView,
  EnrollmentView,
  SubjectRecordView,
} from '@ufc-flow/contracts'

import type { Activity, ActivityCategory } from '../domain/activity'
import type { StoredRecord } from '../domain/academic-record'
import type { Enrollment } from '../domain/enrollment'
import { AcademicRecordErrors } from '../domain/errors'
import type {
  AcademicRecordRepositories,
  CurriculumSnapshot,
  SubjectInfo,
} from '../domain/ports'

// Matrícula de outra pessoa é tratada como inexistente
export async function ownEnrollment(
  repos: AcademicRecordRepositories,
  userId: string,
  id: string,
): Promise<Enrollment> {
  const enrollment = await repos.enrollments.findById(id)
  if (!enrollment || enrollment.userId !== userId) {
    throw AcademicRecordErrors.enrollmentNotFound()
  }
  return enrollment
}

export async function toEnrollmentView(
  repos: AcademicRecordRepositories,
  enrollment: Enrollment,
): Promise<EnrollmentView> {
  const course = await repos.catalog.findCourseById(enrollment.courseId)
  const curriculum = await repos.catalog.findCurriculumById(
    enrollment.curriculumId,
  )
  return {
    id: enrollment.id,
    course: { id: course!.id, slug: course!.slug, name: course!.name },
    curriculum: {
      id: curriculum!.id,
      slug: curriculum!.slug,
      code: curriculum!.code,
    },
    registrationNumber: enrollment.registrationNumber,
    status: enrollment.status,
    isCurrent: enrollment.isCurrent,
    entryTerm: enrollment.entryTerm,
    createdAt: enrollment.createdAt.toISOString(),
  }
}

// Registro com a disciplina do catálogo e a natureza na EC da matrícula
export type RecordWithSubject = SubjectRecordView & { extensionHours: number }

export function toRecordViews(
  records: readonly StoredRecord[],
  subjects: readonly SubjectInfo[],
  snapshot: Pick<CurriculumSnapshot, 'subjects'>,
): RecordWithSubject[] {
  const byId = new Map(subjects.map((subject) => [subject.id, subject]))
  const nature = new Map(
    snapshot.subjects.map((subject) => [subject.code, subject.nature]),
  )
  return records.map((record) => {
    const subject = byId.get(record.subjectId)!
    return {
      id: record.id,
      subjectCode: subject.code,
      subjectName: subject.name,
      workloadHours: subject.workloadHours,
      extensionHours: subject.extensionHours,
      nature: nature.get(subject.code) ?? 'FREE',
      term: record.term,
      status: record.status,
      grade: record.grade,
      sourceRecordId: record.sourceRecordId,
      originNote: record.originNote,
      createdAt: record.createdAt.toISOString(),
    }
  })
}

export const stripExtension = ({
  extensionHours: _extensionHours,
  ...view
}: RecordWithSubject): SubjectRecordView => view

export async function recordViews(
  repos: AcademicRecordRepositories,
  enrollment: Enrollment,
  records: readonly StoredRecord[],
): Promise<SubjectRecordView[]> {
  const subjects = await repos.catalog.subjectsByIds([
    ...new Set(records.map((record) => record.subjectId)),
  ])
  const snapshot = await repos.catalog.snapshot(enrollment.curriculumId)
  return toRecordViews(records, subjects, snapshot).map(stripExtension)
}

export const toActivityView = (activity: Activity): ActivityRecordView => ({
  id: activity.id,
  kind: activity.kind,
  categoryId: activity.categoryId,
  title: activity.title,
  description: activity.description,
  institution: activity.institution,
  hours: activity.hours,
  startedOn: activity.startedOn,
  endedOn: activity.endedOn,
  certificateFileId: activity.certificateFileId,
  createdAt: activity.createdAt.toISOString(),
})

export const toCategoryView = ({
  curriculumId: _curriculumId,
  ...category
}: ActivityCategory): ActivityCategoryView => category
