import { describe, expect, it } from 'vitest'

import { DomainError } from '../../../shared/domain/domain-error'
import { checkActivityCategory } from './activity'
import { AcademicRecord, type StoredRecord } from './academic-record'
import { changeCurriculum, enroll, type Enrollment } from './enrollment'

const NOW = new Date('2026-11-02T12:00:00.000Z')
const CURRENT = '2026.2'

const enrollment = (overrides: Partial<Enrollment> = {}): Enrollment => ({
  id: 'e-1',
  userId: 'u-ana',
  courseId: 'c-eng',
  curriculumId: 'ec-2006',
  registrationNumber: '512345',
  status: 'ACTIVE',
  isCurrent: true,
  entryTerm: '2023.1',
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
})

const codeOf = (fn: () => unknown) => {
  try {
    fn()
  } catch (error) {
    if (error instanceof DomainError) return error.code
    throw error
  }
  return null
}

describe('matrícula', () => {
  const base = {
    id: 'e-2',
    userId: 'u-ana',
    courseId: 'c-eng',
    curriculumId: 'ec-2006',
    registrationNumber: '512345',
    entryTerm: '2023.1',
    currentTerm: CURRENT,
    now: NOW,
  }

  it('a primeira nasce ativa e atual', () => {
    const { enrollment: created, transferred } = enroll({
      ...base,
      current: null,
    })
    expect(created).toMatchObject({ status: 'ACTIVE', isCurrent: true })
    expect(transferred).toBeNull()
  })

  it('em outro curso é transferência interna: a antiga vira TRANSFERRED', () => {
    const { enrollment: created, transferred } = enroll({
      ...base,
      courseId: 'c-cc',
      curriculumId: 'ec-cc',
      current: enrollment(),
    })
    expect(created.isCurrent).toBe(true)
    expect(transferred).toMatchObject({
      id: 'e-1',
      status: 'TRANSFERRED',
      isCurrent: false,
    })
  })

  it('no mesmo curso é recusada', () => {
    expect(codeOf(() => enroll({ ...base, current: enrollment() }))).toBe(
      'ENROLLMENT_ALREADY_EXISTS',
    )
  })

  it('o semestre de entrada não passa do vigente', () => {
    expect(
      codeOf(() => enroll({ ...base, current: null, entryTerm: '2027.1' })),
    ).toBe('ENROLLMENT_ENTRY_TERM_IN_FUTURE')
    expect(
      enroll({ ...base, current: null, currentTerm: null, entryTerm: '2027.1' })
        .enrollment.entryTerm,
    ).toBe('2027.1')
  })

  it('troca de EC só na matrícula atual e ativa', () => {
    expect(changeCurriculum(enrollment(), 'ec-2025', NOW).curriculumId).toBe(
      'ec-2025',
    )
    expect(
      codeOf(() =>
        changeCurriculum(
          enrollment({ status: 'TRANSFERRED', isCurrent: false }),
          'ec-2025',
          NOW,
        ),
      ),
    ).toBe('ENROLLMENT_NOT_ACTIVE')
  })
})

let nextId = 1
const stored = (
  subjectCode: string,
  term: string,
  status: StoredRecord['status'],
  grade: number | null = null,
): StoredRecord => ({
  id: `r-${nextId++}`,
  enrollmentId: 'e-1',
  subjectId: `s-${subjectCode}`,
  subjectCode,
  term,
  status,
  grade,
  sourceRecordId: null,
  originNote: null,
  createdAt: NOW,
  updatedAt: NOW,
})

const candidate = (
  overrides: Partial<Parameters<AcademicRecord['add']>[0]>,
) => ({
  id: 'r-new',
  subjectId: 's-ECO0018',
  subjectCode: 'ECO0018',
  term: CURRENT,
  status: 'CURSANDO' as const,
  grade: null,
  sourceRecordId: null,
  originNote: null,
  now: NOW,
  ...overrides,
})

describe('agregado AcademicRecord', () => {
  it('lança CURSANDO no semestre vigente', () => {
    const record = new AcademicRecord('e-1', [])
    expect(record.add(candidate({}), CURRENT)).toMatchObject({
      enrollmentId: 'e-1',
      status: 'CURSANDO',
    })
  })

  it.each([
    [
      'tentativa em aberto',
      [stored('ECO0018', CURRENT, 'CURSANDO')],
      candidate({ status: 'APROVADO', term: CURRENT }),
      'RECORD_OPEN_ATTEMPT_EXISTS',
    ],
    [
      'disciplina encerrada',
      [stored('ECO0018', '2025.1', 'APROVADO', 7)],
      candidate({}),
      'RECORD_SUBJECT_CLOSED',
    ],
    [
      'semestre futuro',
      [],
      candidate({ status: 'APROVADO', term: '2027.1' }),
      'RECORD_TERM_IN_FUTURE',
    ],
    [
      'CURSANDO no passado',
      [],
      candidate({ term: '2025.2' }),
      'RECORD_IN_PROGRESS_OUTSIDE_CURRENT_TERM',
    ],
    [
      'nova tentativa no mesmo semestre',
      [stored('ECO0018', '2025.2', 'REPROVADO')],
      candidate({ status: 'APROVADO', term: '2025.2' }),
      'RECORD_TERM_NOT_AFTER_LAST_ATTEMPT',
    ],
    [
      'nota em TRANCADA',
      [],
      candidate({ status: 'TRANCADA', term: '2025.2', grade: 5 }),
      'RECORD_GRADE_NOT_ALLOWED',
    ],
    [
      'origem fora de APROVEITADA',
      [],
      candidate({ status: 'APROVADO', term: '2025.2', originNote: 'UECE' }),
      'RECORD_ORIGIN_NOT_ALLOWED',
    ],
  ])('recusa %s', (_case, records, input, code) => {
    const record = new AcademicRecord('e-1', records)
    expect(codeOf(() => record.add(input, CURRENT))).toBe(code)
  })

  it('APROVEITADA aponta a origem', () => {
    const record = new AcademicRecord('e-1', [])
    expect(
      record.add(
        candidate({
          status: 'APROVEITADA',
          term: '2025.1',
          grade: 8.5,
          sourceRecordId: 'r-origem',
        }),
        CURRENT,
      ),
    ).toMatchObject({ status: 'APROVEITADA', sourceRecordId: 'r-origem' })
  })

  it('nova tentativa depois de reprovar', () => {
    const record = new AcademicRecord('e-1', [
      stored('ECO0018', '2025.2', 'REPROVADO', 3),
    ])
    expect(record.add(candidate({}), CURRENT).status).toBe('CURSANDO')
  })

  it('fecha a situação de um CURSANDO', () => {
    const open = stored('ECO0018', CURRENT, 'CURSANDO')
    const record = new AcademicRecord('e-1', [open])
    const later = new Date('2026-12-15T00:00:00.000Z')
    expect(record.close(open.id, 'APROVADO', 9, later)).toMatchObject({
      status: 'APROVADO',
      grade: 9,
      updatedAt: later,
    })
  })

  it('não muda situação final nem aceita nota em SUPRIMIDA', () => {
    const done = stored('ECO0018', '2025.2', 'APROVADO', 7)
    const open = stored('SBL0056', CURRENT, 'CURSANDO')
    const record = new AcademicRecord('e-1', [done, open])
    expect(codeOf(() => record.close(done.id, 'REPROVADO', null, NOW))).toBe(
      'RECORD_INVALID_TRANSITION',
    )
    expect(codeOf(() => record.close(open.id, 'SUPRIMIDA', 4, NOW))).toBe(
      'RECORD_GRADE_NOT_ALLOWED',
    )
    expect(codeOf(() => record.close('r-x', 'APROVADO', null, NOW))).toBe(
      'RECORD_NOT_FOUND',
    )
  })
})

describe('categoria da atividade', () => {
  const categories = [
    { id: 'cat-1', curriculumId: 'ec-2006', kind: 'COMPLEMENTARY' as const },
  ]

  it('sem categoria passa', () => {
    expect(() =>
      checkActivityCategory(null, 'EXTENSION', 'ec-2006', categories),
    ).not.toThrow()
  })

  it('precisa ser da EC e do mesmo tipo', () => {
    expect(
      codeOf(() =>
        checkActivityCategory('cat-x', 'COMPLEMENTARY', 'ec-2006', categories),
      ),
    ).toBe('ACTIVITY_CATEGORY_NOT_FOUND')
    expect(
      codeOf(() =>
        checkActivityCategory('cat-1', 'COMPLEMENTARY', 'ec-2025', categories),
      ),
    ).toBe('ACTIVITY_CATEGORY_NOT_FOUND')
    expect(
      codeOf(() =>
        checkActivityCategory('cat-1', 'EXTENSION', 'ec-2006', categories),
      ),
    ).toBe('ACTIVITY_CATEGORY_KIND_MISMATCH')
  })
})
