import {
  checkNewRecord,
  checkStatusChange,
  parseTerm,
  type RecordStatus,
  type RecordViolation,
  type SubjectRecord,
} from '@ufc-flow/academic-core'

import { AcademicRecordErrors } from './errors'

// Uma tentativa gravada. O semestre fica como código ("2026.1"): o histórico
// passado aceita semestres que não estão cadastrados em academic_terms.
export type StoredRecord = {
  id: string
  enrollmentId: string
  subjectId: string
  subjectCode: string
  term: string
  status: RecordStatus
  grade: number | null
  sourceRecordId: string | null
  originNote: string | null
  createdAt: Date
  updatedAt: Date
}

export type NewRecord = Pick<
  StoredRecord,
  | 'id'
  | 'subjectId'
  | 'subjectCode'
  | 'term'
  | 'status'
  | 'grade'
  | 'sourceRecordId'
  | 'originNote'
> & { now: Date }

export type ClosingStatus = 'APROVADO' | 'REPROVADO' | 'TRANCADA' | 'SUPRIMIDA'

const toCore = (record: StoredRecord): SubjectRecord => ({
  id: record.id,
  subjectCode: record.subjectCode,
  term: parseTerm(record.term)!,
  status: record.status,
  grade: record.grade,
})

function assertNone(violations: readonly RecordViolation[]) {
  const [first] = violations
  if (first) throw AcademicRecordErrors.recordViolation(first.code)
}

// Histórico de uma matrícula. As regras vêm do academic-core; aqui ficam a
// origem do aproveitamento e a montagem do que é gravado.
export class AcademicRecord {
  constructor(
    readonly enrollmentId: string,
    private readonly records: readonly StoredRecord[],
  ) {}

  add(input: NewRecord, currentTerm: string): StoredRecord {
    const hasOrigin = input.sourceRecordId !== null || input.originNote !== null
    if (hasOrigin && input.status !== 'APROVEITADA') {
      throw AcademicRecordErrors.originNotAllowed()
    }
    assertNone(
      checkNewRecord(
        this.records.map(toCore),
        {
          subjectCode: input.subjectCode,
          term: parseTerm(input.term)!,
          status: input.status,
          grade: input.grade,
        },
        parseTerm(currentTerm)!,
      ),
    )
    const { now, ...record } = input
    return {
      ...record,
      enrollmentId: this.enrollmentId,
      createdAt: now,
      updatedAt: now,
    }
  }

  close(
    recordId: string,
    status: ClosingStatus,
    grade: number | null,
    now: Date,
  ): StoredRecord {
    const record = this.records.find((item) => item.id === recordId)
    if (!record) throw AcademicRecordErrors.recordNotFound()
    assertNone(checkStatusChange(toCore(record), status, grade))
    return { ...record, status, grade, updatedAt: now }
  }
}
