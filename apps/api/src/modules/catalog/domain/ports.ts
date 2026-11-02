import type { SigaaCourse } from '@ufc-flow/academic-core'
import type {
  CurriculumImportSource,
  CurriculumImportStatus,
  CurriculumImportV1,
  CurriculumSummary,
} from '@ufc-flow/contracts'

import type { Campus, Course } from './course'
import type { Curriculum } from './curriculum'
import type { ReviewPoint } from './review-points'
import type { Subject } from './subject'

export type SigaaCourseRecord = SigaaCourse & {
  firstSeenAt: Date
  lastSeenAt: Date
  removedAt: Date | null
}

export type CurriculumImport = {
  id: string
  // Curso do Flow; nulo enquanto o curso não existe (importação pendente)
  courseId: string | null
  courseSigaaId: string
  curriculumId: string | null
  source: CurriculumImportSource
  payload: CurriculumImportV1
  status: CurriculumImportStatus
  reviewPoints: ReviewPoint[]
  importedBy: string | null
  createdAt: Date
  appliedAt: Date | null
}

export type ImportPageQuery = {
  status: CurriculumImportStatus | null
  // Admin vê todas; os demais, as dos cursos que moderam e as próprias
  visibleTo: { courseIds: string[]; userId: string } | null
  before: { createdAt: Date; id: string } | null
  limit: number
}

export type AuditEntry = {
  id: string
  actorId: string | null
  entity: string
  entityId: string
  action: string
  changes: Record<string, unknown> | null
  createdAt: Date
}

export interface SigaaCourseRepository {
  list(): Promise<SigaaCourseRecord[]>
  find(sigaaId: string): Promise<SigaaCourseRecord | null>
  // Grava a lista lida do SIGAA; quem sumiu ganha removed_at
  sync(
    courses: SigaaCourse[],
    now: Date,
  ): Promise<{ added: number; removed: number }>
}

export interface CampusRepository {
  findById(id: string): Promise<Campus | null>
  findBySlug(slug: string): Promise<Campus | null>
  insert(campus: Campus): Promise<void>
}

export interface CourseRepository {
  findById(id: string): Promise<Course | null>
  findBySlug(slug: string): Promise<Course | null>
  findBySigaaId(sigaaId: string): Promise<Course | null>
  list(): Promise<Course[]>
  insert(course: Course): Promise<void>
  update(course: Course): Promise<void>
  delete(id: string): Promise<void>
}

export interface SubjectRepository {
  findByCodes(codes: readonly string[]): Promise<Map<string, Subject>>
  findByIds(ids: readonly string[]): Promise<Map<string, Subject>>
  insertMany(subjects: readonly Subject[]): Promise<void>
  update(subject: Subject): Promise<void>
  // Alguma EC publicada usa a disciplina (trava código e cargas)
  usedInPublished(subjectId: string): Promise<boolean>
}

export interface CurriculumRepository {
  findById(id: string): Promise<Curriculum | null>
  findBySlug(courseId: string, slug: string): Promise<Curriculum | null>
  // A importação acha a EC pelo código do SIGAA; o slug pode ter sido
  // editado (URLs antigas)
  findByCode(courseId: string, code: string): Promise<Curriculum | null>
  summaries(courseId: string): Promise<CurriculumSummary[]>
  // Grava o agregado inteiro: cabeçalho, vertentes, disciplinas e vínculos
  save(curriculum: Curriculum): Promise<void>
  delete(id: string): Promise<void>
  // Desmarca a vigente anterior do curso e marca esta
  setCurrent(courseId: string, curriculumId: string): Promise<void>
}

export interface ImportRepository {
  findById(id: string): Promise<CurriculumImport | null>
  insert(record: CurriculumImport): Promise<void>
  update(record: CurriculumImport): Promise<void>
  list(query: ImportPageQuery): Promise<CurriculumImport[]>
  // Importações paradas esperando o curso ser criado
  pendingForCourse(sigaaId: string): Promise<CurriculumImport[]>
  // Os pontos para revisar da EC vêm da última importação aplicada
  latestApplied(curriculumId: string): Promise<CurriculumImport | null>
}

export interface UserDirectory {
  isAdmin(userId: string): Promise<boolean>
  names(ids: readonly string[]): Promise<Map<string, string>>
}

export interface AuditLog {
  record(entry: AuditEntry): Promise<void>
}

// Matrículas vinculadas à EC (qualquer situação): EC publicada com matrícula
// fica travada no editor
export interface EnrollmentCounter {
  countForCurriculum(curriculumId: string): Promise<number>
}

export type CatalogRepositories = {
  sigaaCourses: SigaaCourseRepository
  campuses: CampusRepository
  courses: CourseRepository
  subjects: SubjectRepository
  curricula: CurriculumRepository
  imports: ImportRepository
  users: UserDirectory
  enrollments: EnrollmentCounter
  audit: AuditLog
}

// Tudo que um caso de uso grava dentro de run() é atômico
export interface CatalogUnitOfWork {
  run<T>(work: (repositories: CatalogRepositories) => Promise<T>): Promise<T>
}

// Lista pública de cursos do SIGAA (sem login, windows-1252)
export interface SigaaCourseSource {
  fetchAll(): Promise<SigaaCourse[]>
}

export const CATALOG_UOW = Symbol('CatalogUnitOfWork')
export const SIGAA_COURSE_SOURCE = Symbol('SigaaCourseSource')
