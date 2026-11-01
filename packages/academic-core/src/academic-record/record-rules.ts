import { compareTerms, type Term } from '../terms/term'
import type {
  NewSubjectRecord,
  RecordStatus,
  RecordViolation,
  SubjectRecord,
} from './types'

// Encerram a disciplina: nenhuma tentativa nova depois
const COMPLETED_STATUSES: ReadonlySet<RecordStatus> = new Set([
  'APROVADO',
  'APROVEITADA',
])

// Fechamentos possíveis de CURSANDO
const CLOSING_STATUSES: ReadonlySet<RecordStatus> = new Set([
  'APROVADO',
  'REPROVADO',
  'TRANCADA',
  'SUPRIMIDA',
])

const GRADED_STATUSES: ReadonlySet<RecordStatus> = new Set([
  'APROVADO',
  'REPROVADO',
  'APROVEITADA',
])

// Nota opcional em APROVADO, REPROVADO e APROVEITADA, de 0 a 10 com até duas
// casas decimais; proibida nas demais situações
export function checkGrade(
  status: RecordStatus,
  grade: number | null,
): RecordViolation[] {
  if (grade === null) return []
  if (!GRADED_STATUSES.has(status)) {
    return [{ code: 'RECORD_GRADE_NOT_ALLOWED' }]
  }
  if (!Number.isFinite(grade) || grade < 0 || grade > 10) {
    return [{ code: 'RECORD_GRADE_OUT_OF_RANGE' }]
  }
  const cents = grade * 100
  if (Math.abs(cents - Math.round(cents)) > 1e-9) {
    return [{ code: 'RECORD_GRADE_INVALID_PRECISION' }]
  }
  return []
}

// Regras do histórico para lançar uma tentativa. O histórico passado pode ser
// lançado direto com situação final; CURSANDO só no semestre vigente.
export function checkNewRecord(
  records: readonly SubjectRecord[],
  candidate: NewSubjectRecord,
  currentTerm: Term,
): RecordViolation[] {
  const violations: RecordViolation[] = []
  const termOrder = compareTerms(candidate.term, currentTerm)

  if (termOrder > 0) {
    violations.push({ code: 'RECORD_TERM_IN_FUTURE' })
  } else if (candidate.status === 'CURSANDO' && termOrder < 0) {
    violations.push({ code: 'RECORD_IN_PROGRESS_OUTSIDE_CURRENT_TERM' })
  }

  const attempts = records.filter(
    (record) => record.subjectCode === candidate.subjectCode,
  )

  const open = attempts.filter((record) => record.status === 'CURSANDO')
  if (open.length > 0) {
    violations.push({
      code: 'RECORD_OPEN_ATTEMPT_EXISTS',
      recordIds: open.map((record) => record.id),
    })
  }

  const completed = attempts.filter((record) =>
    COMPLETED_STATUSES.has(record.status),
  )
  if (completed.length > 0) {
    violations.push({
      code: 'RECORD_SUBJECT_CLOSED',
      recordIds: completed.map((record) => record.id),
    })
  }

  const notBefore = attempts.filter(
    (record) => compareTerms(record.term, candidate.term) >= 0,
  )
  if (notBefore.length > 0) {
    violations.push({
      code: 'RECORD_TERM_NOT_AFTER_LAST_ATTEMPT',
      recordIds: notBefore.map((record) => record.id),
    })
  }

  return [...violations, ...checkGrade(candidate.status, candidate.grade)]
}

// Só CURSANDO muda de situação, e só para APROVADO, REPROVADO, TRANCADA ou
// SUPRIMIDA. As demais situações são finais para a tentativa.
export function checkStatusChange(
  record: SubjectRecord,
  status: RecordStatus,
  grade: number | null,
): RecordViolation[] {
  if (record.status !== 'CURSANDO' || !CLOSING_STATUSES.has(status)) {
    return [{ code: 'RECORD_INVALID_TRANSITION', recordIds: [record.id] }]
  }
  return checkGrade(status, grade)
}

// CURSANDO de semestres anteriores ao vigente: o front pede para fechar
export function findStaleInProgress<T extends SubjectRecord>(
  records: readonly T[],
  currentTerm: Term,
): T[] {
  return records.filter(
    (record) =>
      record.status === 'CURSANDO' &&
      compareTerms(record.term, currentTerm) < 0,
  )
}

// Códigos das disciplinas cumpridas (APROVADO ou APROVEITADA)
export function completedSubjectCodes(
  records: readonly Pick<SubjectRecord, 'subjectCode' | 'status'>[],
): Set<string> {
  return new Set(
    records
      .filter((record) => COMPLETED_STATUSES.has(record.status))
      .map((record) => record.subjectCode),
  )
}
