import type { ScheduleView } from '@ufc-flow/contracts'

import type { Schedule, SectionSnapshot } from './schedule'

export interface ScheduleRepository {
  // De qualquer usuário: quem chama confere o dono
  findById(id: string): Promise<Schedule | null>
  // Grava a agenda inteira, com os itens
  save(schedule: Schedule): Promise<void>
  delete(id: string): Promise<void>
}

export type ScheduleFilter = {
  courseId?: string
  curriculumId?: string
  termId?: string
}

// Leitura: a agenda com os dados atuais das turmas e os avisos
export interface ScheduleReader {
  list(userId: string, filter: ScheduleFilter): Promise<ScheduleView[]>
  get(id: string): Promise<ScheduleView | null>
}

// Curso, EC publicada e semestre a que a agenda pertence
export interface PlanningContext {
  findCourse(slug: string): Promise<{ id: string; isActive: boolean } | null>
  findPublishedCurriculum(
    courseId: string,
    slug: string,
  ): Promise<{ id: string } | null>
  findTerm(code: string): Promise<{ id: string } | null>
}

export interface SectionLookup {
  byIds(ids: readonly string[]): Promise<SectionSnapshot[]>
  // Pela chave natural (semestre, disciplina, turma), para a importação
  byKeys(
    termId: string,
    keys: readonly { subjectCode: string; sectionCode: string }[],
  ): Promise<SectionSnapshot[]>
}

export type PlanningRepositories = {
  schedules: ScheduleRepository
  reader: ScheduleReader
  context: PlanningContext
  sections: SectionLookup
}

export interface PlanningUnitOfWork {
  run<T>(work: (repositories: PlanningRepositories) => Promise<T>): Promise<T>
}

export const PLANNING_UOW = Symbol('PlanningUnitOfWork')
