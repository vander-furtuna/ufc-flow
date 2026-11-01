import { describe, expect, it } from 'vitest'

import type { Term } from '../terms/term'
import {
  checkGrade,
  checkNewRecord,
  checkStatusChange,
  completedSubjectCodes,
  findStaleInProgress,
} from './record-rules'
import type { NewSubjectRecord, SubjectRecord } from './types'

const term = (code: string): Term => {
  const [year, period] = code.split('.').map(Number)
  return { year: year as number, period: period as 1 | 2 }
}

const current = term('2026.2')

let nextId = 1
const record = (
  subjectCode: string,
  termCode: string,
  status: SubjectRecord['status'],
  grade: number | null = null,
): SubjectRecord => ({
  id: `r${nextId++}`,
  subjectCode,
  term: term(termCode),
  status,
  grade,
})

const candidate = (
  subjectCode: string,
  termCode: string,
  status: NewSubjectRecord['status'],
  grade: number | null = null,
): NewSubjectRecord => ({ subjectCode, term: term(termCode), status, grade })

const codes = (violations: { code: string }[]) => violations.map((v) => v.code)

describe('checkNewRecord', () => {
  it('aceita a primeira tentativa no semestre vigente', () => {
    expect(
      checkNewRecord([], candidate('ECO0001', '2026.2', 'CURSANDO'), current),
    ).toEqual([])
  })

  describe('uma tentativa em aberto por disciplina', () => {
    it('recusa um segundo CURSANDO da mesma disciplina', () => {
      const records = [record('ECO0001', '2026.2', 'CURSANDO')]
      expect(
        codes(
          checkNewRecord(
            records,
            candidate('ECO0001', '2026.2', 'CURSANDO'),
            current,
          ),
        ),
      ).toContain('RECORD_OPEN_ATTEMPT_EXISTS')
    })

    it('aceita CURSANDO de outra disciplina', () => {
      const records = [record('ECO0001', '2026.2', 'CURSANDO')]
      expect(
        checkNewRecord(
          records,
          candidate('ECO0002', '2026.2', 'CURSANDO'),
          current,
        ),
      ).toEqual([])
    })
  })

  describe('CURSANDO só no semestre vigente', () => {
    it('recusa CURSANDO num semestre passado', () => {
      expect(
        codes(
          checkNewRecord(
            [],
            candidate('ECO0001', '2026.1', 'CURSANDO'),
            current,
          ),
        ),
      ).toEqual(['RECORD_IN_PROGRESS_OUTSIDE_CURRENT_TERM'])
    })

    it('recusa qualquer registro num semestre futuro', () => {
      expect(
        codes(
          checkNewRecord(
            [],
            candidate('ECO0001', '2027.1', 'CURSANDO'),
            current,
          ),
        ),
      ).toEqual(['RECORD_TERM_IN_FUTURE'])
      expect(
        codes(
          checkNewRecord(
            [],
            candidate('ECO0001', '2027.1', 'APROVADO'),
            current,
          ),
        ),
      ).toEqual(['RECORD_TERM_IN_FUTURE'])
    })

    it('aceita lançar o histórico passado com situação final', () => {
      for (const status of [
        'APROVADO',
        'REPROVADO',
        'TRANCADA',
        'SUPRIMIDA',
        'APROVEITADA',
      ] as const) {
        expect(
          checkNewRecord([], candidate('ECO0001', '2024.1', status), current),
        ).toEqual([])
      }
    })
  })

  describe('nova tentativa', () => {
    it.each(['REPROVADO', 'TRANCADA', 'SUPRIMIDA'] as const)(
      'aceita depois de %s, em semestre posterior',
      (status) => {
        const records = [record('ECO0001', '2025.2', status)]
        expect(
          checkNewRecord(
            records,
            candidate('ECO0001', '2026.2', 'CURSANDO'),
            current,
          ),
        ).toEqual([])
      },
    )

    it('aceita depois de várias tentativas sem aprovação', () => {
      const records = [
        record('ECO0001', '2025.1', 'REPROVADO'),
        record('ECO0001', '2025.2', 'TRANCADA'),
      ]
      expect(
        checkNewRecord(
          records,
          candidate('ECO0001', '2026.1', 'REPROVADO'),
          current,
        ),
      ).toEqual([])
    })

    it('recusa no mesmo semestre da última tentativa', () => {
      const records = [record('ECO0001', '2026.1', 'REPROVADO')]
      expect(
        codes(
          checkNewRecord(
            records,
            candidate('ECO0001', '2026.1', 'APROVADO'),
            current,
          ),
        ),
      ).toEqual(['RECORD_TERM_NOT_AFTER_LAST_ATTEMPT'])
    })

    it('recusa num semestre anterior à última tentativa', () => {
      const records = [
        record('ECO0001', '2024.1', 'REPROVADO'),
        record('ECO0001', '2025.2', 'SUPRIMIDA'),
      ]
      expect(
        codes(
          checkNewRecord(
            records,
            candidate('ECO0001', '2025.1', 'REPROVADO'),
            current,
          ),
        ),
      ).toEqual(['RECORD_TERM_NOT_AFTER_LAST_ATTEMPT'])
    })
  })

  describe('disciplina encerrada', () => {
    it.each(['APROVADO', 'APROVEITADA'] as const)(
      'recusa nova tentativa depois de %s',
      (status) => {
        const records = [record('ECO0001', '2025.1', status)]
        expect(
          codes(
            checkNewRecord(
              records,
              candidate('ECO0001', '2026.2', 'CURSANDO'),
              current,
            ),
          ),
        ).toEqual(['RECORD_SUBJECT_CLOSED'])
      },
    )
  })

  describe('APROVEITADA', () => {
    it('é lançada direto, sem passar por CURSANDO', () => {
      expect(
        checkNewRecord(
          [],
          candidate('ECO0001', '2026.2', 'APROVEITADA', 8.5),
          current,
        ),
      ).toEqual([])
    })

    it('pode vir depois de uma reprovação', () => {
      const records = [record('ECO0001', '2025.1', 'REPROVADO')]
      expect(
        checkNewRecord(
          records,
          candidate('ECO0001', '2026.1', 'APROVEITADA'),
          current,
        ),
      ).toEqual([])
    })
  })

  it('confere a nota do registro novo', () => {
    expect(
      codes(
        checkNewRecord(
          [],
          candidate('ECO0001', '2026.2', 'CURSANDO', 7),
          current,
        ),
      ),
    ).toEqual(['RECORD_GRADE_NOT_ALLOWED'])
  })
})

describe('checkStatusChange (fechamento)', () => {
  it.each(['APROVADO', 'REPROVADO', 'TRANCADA', 'SUPRIMIDA'] as const)(
    'fecha CURSANDO como %s',
    (status) => {
      expect(
        checkStatusChange(
          record('ECO0001', '2026.2', 'CURSANDO'),
          status,
          null,
        ),
      ).toEqual([])
    },
  )

  it('não fecha CURSANDO como APROVEITADA', () => {
    expect(
      codes(
        checkStatusChange(
          record('ECO0001', '2026.2', 'CURSANDO'),
          'APROVEITADA',
          null,
        ),
      ),
    ).toEqual(['RECORD_INVALID_TRANSITION'])
  })

  it.each([
    'APROVADO',
    'REPROVADO',
    'TRANCADA',
    'SUPRIMIDA',
    'APROVEITADA',
  ] as const)('%s é final e não muda de situação', (status) => {
    expect(
      codes(
        checkStatusChange(
          record('ECO0001', '2025.1', status),
          'CURSANDO',
          null,
        ),
      ),
    ).toEqual(['RECORD_INVALID_TRANSITION'])
  })

  it('confere a nota da nova situação', () => {
    expect(
      codes(
        checkStatusChange(
          record('ECO0001', '2026.2', 'CURSANDO'),
          'TRANCADA',
          5,
        ),
      ),
    ).toEqual(['RECORD_GRADE_NOT_ALLOWED'])
    expect(
      checkStatusChange(
        record('ECO0001', '2026.2', 'CURSANDO'),
        'APROVADO',
        9.25,
      ),
    ).toEqual([])
  })
})

describe('checkGrade', () => {
  it.each(['APROVADO', 'REPROVADO', 'APROVEITADA'] as const)(
    'nota é opcional em %s',
    (status) => {
      expect(checkGrade(status, null)).toEqual([])
      expect(checkGrade(status, 0)).toEqual([])
      expect(checkGrade(status, 10)).toEqual([])
      expect(checkGrade(status, 6.75)).toEqual([])
    },
  )

  it.each(['CURSANDO', 'TRANCADA', 'SUPRIMIDA'] as const)(
    'nota é proibida em %s',
    (status) => {
      expect(checkGrade(status, null)).toEqual([])
      expect(codes(checkGrade(status, 5))).toEqual(['RECORD_GRADE_NOT_ALLOWED'])
    },
  )

  it.each([-0.01, 10.01, 11, Number.NaN, Number.POSITIVE_INFINITY])(
    'recusa a nota %s fora de 0 a 10',
    (grade) => {
      expect(codes(checkGrade('APROVADO', grade))).toEqual([
        'RECORD_GRADE_OUT_OF_RANGE',
      ])
    },
  )

  it('aceita no máximo duas casas decimais', () => {
    expect(checkGrade('APROVADO', 7.1)).toEqual([])
    expect(checkGrade('APROVADO', 7.15)).toEqual([])
    expect(codes(checkGrade('APROVADO', 7.155))).toEqual([
      'RECORD_GRADE_INVALID_PRECISION',
    ])
  })
})

describe('findStaleInProgress', () => {
  it('aponta CURSANDO de semestres passados para o aluno fechar', () => {
    const stale = record('ECO0001', '2026.1', 'CURSANDO')
    const records = [
      stale,
      record('ECO0002', '2026.2', 'CURSANDO'),
      record('ECO0003', '2025.2', 'APROVADO'),
    ]
    expect(findStaleInProgress(records, current)).toEqual([stale])
  })
})

describe('completedSubjectCodes', () => {
  it('reúne as disciplinas com APROVADO ou APROVEITADA', () => {
    const records = [
      record('ECO0001', '2025.1', 'REPROVADO'),
      record('ECO0001', '2025.2', 'APROVADO'),
      record('ECO0002', '2025.2', 'APROVEITADA'),
      record('ECO0003', '2026.2', 'CURSANDO'),
      record('ECO0004', '2025.2', 'TRANCADA'),
    ]
    expect(completedSubjectCodes(records)).toEqual(
      new Set(['ECO0001', 'ECO0002']),
    )
  })
})
