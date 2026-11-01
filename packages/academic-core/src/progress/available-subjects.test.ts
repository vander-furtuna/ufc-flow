import { describe, expect, it } from 'vitest'

import type { RequirementExpr } from '../requirements/types'
import { findAvailableSubjects } from './available-subjects'
import type { CurriculumRequirements } from './types'

const s = (code: string): RequirementExpr => ({ kind: 'subject', code })
const and = (...items: RequirementExpr[]): RequirementExpr => ({
  kind: 'and',
  items,
})
const or = (...items: RequirementExpr[]): RequirementExpr => ({
  kind: 'or',
  items,
})

const subjects: CurriculumRequirements[] = [
  { code: 'A001', prerequisite: null, corequisite: null },
  { code: 'B001', prerequisite: s('A001'), corequisite: null },
  { code: 'C001', prerequisite: and(s('A001'), s('B001')), corequisite: null },
  { code: 'D001', prerequisite: or(s('B001'), s('X001')), corequisite: null },
  { code: 'E001', prerequisite: null, corequisite: s('F001') },
  { code: 'F001', prerequisite: null, corequisite: s('E001') },
]

const codes = (result: { code: string }[]) => result.map((item) => item.code)

describe('findAvailableSubjects', () => {
  it('sem histórico, libera só o que não tem pré-requisito', () => {
    expect(
      codes(
        findAvailableSubjects({
          subjects,
          completedCodes: new Set(),
          inProgressCodes: new Set(),
        }),
      ),
    ).toEqual(['A001', 'E001', 'F001'])
  })

  it('libera quando o E e o OU são cumpridos, e tira o que já foi cumprido', () => {
    expect(
      codes(
        findAvailableSubjects({
          subjects,
          completedCodes: new Set(['A001', 'B001']),
          inProgressCodes: new Set(),
        }),
      ),
    ).toEqual(['C001', 'D001', 'E001', 'F001'])
  })

  it('o OU é cumprido por qualquer uma das opções', () => {
    const result = findAvailableSubjects({
      subjects,
      completedCodes: new Set(['A001', 'X001']),
      inProgressCodes: new Set(),
    })
    expect(codes(result)).toContain('D001')
    expect(codes(result)).not.toContain('C001')
  })

  it('tira o que está em andamento e não usa CURSANDO como pré-requisito', () => {
    expect(
      codes(
        findAvailableSubjects({
          subjects,
          completedCodes: new Set(['A001']),
          inProgressCodes: new Set(['B001']),
        }),
      ),
    ).toEqual(['E001', 'F001'])
  })

  it('cumpre o pré-requisito por equivalência e tira a disciplina cumprida por equivalência', () => {
    const result = findAvailableSubjects({
      subjects,
      completedCodes: new Set(['EQV0001']),
      inProgressCodes: new Set(),
      equivalences: new Map([['A001', s('EQV0001')]]),
    })
    expect(codes(result)).not.toContain('A001')
    expect(codes(result)).toContain('B001')
  })

  it('aponta os co-requisitos que faltam cursar junto', () => {
    const result = findAvailableSubjects({
      subjects,
      completedCodes: new Set(),
      inProgressCodes: new Set(),
    })
    expect(result.find((item) => item.code === 'E001')).toEqual({
      code: 'E001',
      missingCorequisites: ['F001'],
    })
  })

  it('co-requisito cumprido ou em andamento não fica pendente', () => {
    const result = findAvailableSubjects({
      subjects,
      completedCodes: new Set(),
      inProgressCodes: new Set(['F001']),
    })
    expect(result.find((item) => item.code === 'E001')).toEqual({
      code: 'E001',
      missingCorequisites: [],
    })
  })
})
