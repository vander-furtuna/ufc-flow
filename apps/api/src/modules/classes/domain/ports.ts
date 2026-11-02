import type { ScrapeStatus, ScrapeTrigger } from '@ufc-flow/contracts'

import type { ScrapedSection, SectionRecord } from './section'
import type { AcademicTerm } from './term'

export type CourseRef = {
  id: string
  slug: string
  sigaaId: string
  isActive: boolean
}

export type OfferedSection = SectionRecord & { reservedSeats: number }

export type ScrapeRunRecord = {
  id: string
  courseId: string
  termId: string
  trigger: ScrapeTrigger
  status: ScrapeStatus
  startedAt: Date
  finishedAt: Date | null
  sectionsSeen: number
  sectionsChanged: number
  error: string | null
}

export interface TermRepository {
  list(): Promise<AcademicTerm[]>
  findByCode(code: string): Promise<AcademicTerm | null>
  findCurrent(): Promise<AcademicTerm | null>
  insert(term: AcademicTerm): Promise<void>
  update(term: AcademicTerm): Promise<void>
  delete(id: string): Promise<void>
  // Desmarca o vigente anterior e marca este
  setCurrent(id: string): Promise<void>
  hasSections(termId: string): Promise<boolean>
}

export interface SectionRepository {
  // Turmas já guardadas do semestre com essas chaves naturais
  findByKeys(
    termId: string,
    keys: readonly { subjectCode: string; sectionCode: string }[],
  ): Promise<SectionRecord[]>
  // Grava as turmas com horários e docentes
  saveAll(sections: readonly SectionRecord[]): Promise<void>
  // As ofertas do curso no semestre passam a ser exatamente estas
  replaceOffers(
    termId: string,
    courseId: string,
    offers: readonly { sectionId: string; reservedSeats: number }[],
    now: Date,
  ): Promise<void>
  // Turma que nenhum curso oferta mais recebe removed_at
  markOrphansRemoved(termId: string, now: Date): Promise<number>
  listOffered(termId: string, courseId: string): Promise<OfferedSection[]>
}

export interface CourseDirectory {
  findBySlug(slug: string): Promise<CourseRef | null>
  listActive(): Promise<CourseRef[]>
}

export interface ScrapeRunRepository {
  insert(run: ScrapeRunRecord): Promise<void>
  update(run: ScrapeRunRecord): Promise<void>
  lastSuccess(courseId: string, termId: string): Promise<Date | null>
}

export type ClassesRepositories = {
  terms: TermRepository
  sections: SectionRepository
  courses: CourseDirectory
  runs: ScrapeRunRepository
}

export interface ClassesUnitOfWork {
  run<T>(work: (repositories: ClassesRepositories) => Promise<T>): Promise<T>
}

// Página pública de turmas do SIGAA (sem login)
export interface SigaaSectionSource {
  fetch(
    sigaaCourseId: string,
    year: number,
    period: number,
  ): Promise<ScrapedSection[]>
}

// Pausa entre cursos na coleta agendada, para não sobrecarregar o SIGAA
export type Pause = (ms: number) => Promise<void>

export const CLASSES_UOW = Symbol('ClassesUnitOfWork')
export const SIGAA_SECTION_SOURCE = Symbol('SigaaSectionSource')
export const PAUSE = Symbol('Pause')
export const COLLECTION_SETTINGS = Symbol('CollectionSettings')

export type CollectionSettings = { pauseMs: number }
