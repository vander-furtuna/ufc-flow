import type { Term } from '../terms/term'

export type RecordStatus =
  | 'CURSANDO'
  | 'APROVADO'
  | 'REPROVADO'
  | 'TRANCADA'
  | 'SUPRIMIDA'
  | 'APROVEITADA'

// Uma tentativa: uma disciplina, num semestre, com uma situação
export type SubjectRecord = {
  id: string
  subjectCode: string
  term: Term
  status: RecordStatus
  // 0 a 10, duas casas; só em APROVADO, REPROVADO e APROVEITADA
  grade: number | null
}

export type NewSubjectRecord = Omit<SubjectRecord, 'id'>

export type RecordViolationCode =
  | 'RECORD_OPEN_ATTEMPT_EXISTS'
  | 'RECORD_IN_PROGRESS_OUTSIDE_CURRENT_TERM'
  | 'RECORD_TERM_IN_FUTURE'
  | 'RECORD_TERM_NOT_AFTER_LAST_ATTEMPT'
  | 'RECORD_SUBJECT_CLOSED'
  | 'RECORD_INVALID_TRANSITION'
  | 'RECORD_GRADE_NOT_ALLOWED'
  | 'RECORD_GRADE_OUT_OF_RANGE'
  | 'RECORD_GRADE_INVALID_PRECISION'

export type RecordViolation = {
  code: RecordViolationCode
  // Registros existentes que causam a violação, quando há
  recordIds?: string[]
}
