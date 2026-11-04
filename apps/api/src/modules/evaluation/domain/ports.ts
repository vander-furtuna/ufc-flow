import type { RecordStatus } from '@ufc-flow/academic-core'

import type { Criterion, Score } from './evaluation'

export type Evaluation = {
  id: string
  userId: string
  subjectId: string
  scores: Score[]
  createdAt: Date
  updatedAt: Date
}

export interface CriterionRepository {
  list(): Promise<Criterion[]>
  findById(id: string): Promise<Criterion | null>
  keyTaken(key: string, exceptId: string | null): Promise<boolean>
  save(criterion: Criterion): Promise<void>
}

export interface EvaluationRepository {
  findMine(userId: string, subjectId: string): Promise<Evaluation | null>
  // Grava a avaliação e troca as notas
  save(evaluation: Evaluation): Promise<void>
}

export interface EvaluationReader {
  // Quantas avaliações e todas as notas da disciplina (sem quem deu)
  totals(subjectId: string): Promise<{ total: number; scores: Score[] }>
}

export interface EvaluationDirectory {
  subjectByCode(
    code: string,
  ): Promise<{ id: string; code: string; name: string } | null>
  // Registros da pessoa na disciplina, em qualquer matrícula
  records(
    userId: string,
    subjectId: string,
  ): Promise<{ status: RecordStatus; termCode: string }[]>
  email(userId: string): Promise<string | null>
}

export type EvaluationRepositories = {
  criteria: CriterionRepository
  evaluations: EvaluationRepository
  reader: EvaluationReader
  directory: EvaluationDirectory
}

export interface EvaluationUnitOfWork {
  run<T>(work: (repositories: EvaluationRepositories) => Promise<T>): Promise<T>
}

export const EVALUATION_UOW = Symbol('EvaluationUnitOfWork')
// Exigir e-mail @alu.ufc.br para avaliar (EVALUATION_REQUIRE_INSTITUTIONAL_EMAIL)
export const EVALUATION_SETTINGS = Symbol('EvaluationSettings')
export type EvaluationSettings = { requireInstitutionalEmail: boolean }
