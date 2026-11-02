import type {
  CurriculumNature,
  RequirementExpr,
  ProgressBranchType,
} from '@ufc-flow/academic-core'
import type { SubjectType } from '@ufc-flow/contracts'

import type { FileAttachmentRepository } from '../../files/domain/ports'
import type { Activity, ActivityCategory } from './activity'
import type { StoredRecord } from './academic-record'
import type { Enrollment } from './enrollment'

export interface EnrollmentRepository {
  // De qualquer usuário: quem chama confere o dono
  findById(id: string): Promise<Enrollment | null>
  findCurrent(userId: string): Promise<Enrollment | null>
  // A atual primeiro, depois da mais nova para a mais antiga
  listByUser(userId: string): Promise<Enrollment[]>
  save(enrollment: Enrollment): Promise<void>
}

export interface SubjectRecordRepository {
  findById(id: string): Promise<StoredRecord | null>
  listByEnrollment(enrollmentId: string): Promise<StoredRecord[]>
  insert(record: StoredRecord): Promise<void>
  update(record: StoredRecord): Promise<void>
  delete(id: string): Promise<void>
}

export interface ActivityRepository {
  findById(id: string): Promise<Activity | null>
  listByEnrollment(enrollmentId: string): Promise<Activity[]>
  save(activity: Activity): Promise<void>
  delete(id: string): Promise<void>
  // Depois de migrar de EC, as categorias da EC antiga deixam de valer
  clearCategoriesOutside(
    enrollmentId: string,
    curriculumId: string,
  ): Promise<void>
}

export interface ActivityCategoryRepository {
  findById(id: string): Promise<ActivityCategory | null>
  listByCurriculum(curriculumId: string): Promise<ActivityCategory[]>
  save(category: ActivityCategory): Promise<void>
  delete(id: string): Promise<void>
}

export type CourseInfo = {
  id: string
  slug: string
  name: string
  isActive: boolean
}

export type CurriculumInfo = {
  id: string
  courseId: string
  slug: string
  code: string
  published: boolean
}

export type SubjectInfo = {
  id: string
  code: string
  name: string
  workloadHours: number
  extensionHours: number
}

// Tudo da EC que o progresso e as liberadas precisam
export type CurriculumSnapshot = {
  mandatoryHours: number
  optativeHours: number
  maxFreeOptativeHours: number
  extensionHours: number
  minTotalHours: number
  minEmphases: number | null
  maxEmphases: number | null
  periodAvgHours: number | null
  subjects: {
    code: string
    name: string
    type: SubjectType
    semester: number | null
    nature: CurriculumNature
    workloadHours: number
    extensionHours: number
    branchIds: string[]
    prerequisite: RequirementExpr | null
    corequisite: RequirementExpr | null
  }[]
  branches: {
    id: string
    parentId: string | null
    type: ProgressBranchType
    name: string
    color: string | null
    minHours: number | null
    maxHours: number | null
    minComponents: number | null
    maxComponents: number | null
  }[]
  // Equivalências das disciplinas da EC e das citadas nos requisitos
  equivalences: Map<string, RequirementExpr>
}

// Leituras do catálogo e do semestre vigente
export interface AcademicCatalog {
  findCourse(slug: string): Promise<CourseInfo | null>
  findCourseById(id: string): Promise<CourseInfo | null>
  findCurriculum(courseId: string, slug: string): Promise<CurriculumInfo | null>
  findCurriculumById(id: string): Promise<CurriculumInfo | null>
  subjectsByCodes(codes: readonly string[]): Promise<SubjectInfo[]>
  subjectsByIds(ids: readonly string[]): Promise<SubjectInfo[]>
  currentTerm(): Promise<{ code: string; endsAt: string } | null>
  snapshot(curriculumId: string): Promise<CurriculumSnapshot>
}

export type AuditEntry = {
  id: string
  actorId: string
  entity: string
  entityId: string
  action: string
  changes: Record<string, unknown>
}

export interface AuditLog {
  record(entry: AuditEntry): Promise<void>
}

export type AcademicRecordRepositories = {
  enrollments: EnrollmentRepository
  records: SubjectRecordRepository
  activities: ActivityRepository
  categories: ActivityCategoryRepository
  catalog: AcademicCatalog
  files: FileAttachmentRepository
  audit: AuditLog
}

export interface AcademicRecordUnitOfWork {
  run<T>(
    work: (repositories: AcademicRecordRepositories) => Promise<T>,
  ): Promise<T>
}

export const ACADEMIC_RECORD_UOW = Symbol('AcademicRecordUnitOfWork')
