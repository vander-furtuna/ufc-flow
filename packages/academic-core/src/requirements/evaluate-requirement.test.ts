import { describe, expect, it } from 'vitest'

import { collectCodes } from './collect-codes'
import {
  isRequirementMet,
  isSubjectCompleted,
  type Equivalences,
} from './evaluate-requirement'
import { normalizeRequirement } from './normalize-requirement'
import type { RequirementExpr } from './types'

const s = (code: string): RequirementExpr => ({ kind: 'subject', code })
const and = (...items: RequirementExpr[]): RequirementExpr => ({
  kind: 'and',
  items,
})
const or = (...items: RequirementExpr[]): RequirementExpr => ({
  kind: 'or',
  items,
})

describe('collectCodes', () => {
  it('lista os códigos citados, na ordem e sem repetir', () => {
    expect(
      collectCodes(and(or(s('B001'), s('A001')), s('C001'), or(s('A001')))),
    ).toEqual(['B001', 'A001', 'C001'])
  })

  it('devolve lista vazia sem requisito', () => {
    expect(collectCodes(null)).toEqual([])
  })
})

describe('normalizeRequirement', () => {
  it('remove grupos vazios e desembrulha grupos de um item', () => {
    expect(
      normalizeRequirement(and(or(), s('A001'), and(or(s('B001'))))),
    ).toEqual(and(s('A001'), s('B001')))
  })

  it('devolve null quando não sobra nada', () => {
    expect(normalizeRequirement(and(or(), and()))).toBeNull()
  })

  it('achata grupos do mesmo tipo e remove repetições', () => {
    expect(
      normalizeRequirement(or(s('A001'), or(s('B001'), s('A001')))),
    ).toEqual(or(s('A001'), s('B001')))
  })

  it('remove grupos repetidos', () => {
    expect(
      normalizeRequirement(
        and(or(s('A001'), s('B001')), or(s('A001'), s('B001'))),
      ),
    ).toEqual(or(s('A001'), s('B001')))
  })
})

describe('isRequirementMet', () => {
  const completed = new Set(['ECO0001', 'SBL0056'])

  it('sem requisito, está cumprido', () => {
    expect(isRequirementMet(null, completed)).toBe(true)
  })

  it('disciplina cumprida', () => {
    expect(isRequirementMet(s('ECO0001'), completed)).toBe(true)
    expect(isRequirementMet(s('ECO0002'), completed)).toBe(false)
  })

  it('E exige todas', () => {
    expect(isRequirementMet(and(s('ECO0001'), s('SBL0056')), completed)).toBe(
      true,
    )
    expect(isRequirementMet(and(s('ECO0001'), s('SBL0057')), completed)).toBe(
      false,
    )
  })

  it('OU exige uma', () => {
    expect(isRequirementMet(or(s('EEL0001'), s('ECO0001')), completed)).toBe(
      true,
    )
    expect(isRequirementMet(or(s('EEL0001'), s('EEL0002')), completed)).toBe(
      false,
    )
  })

  it('combina E e OU', () => {
    const expr = and(or(s('SBL0080'), s('ECO0001')), s('SBL0056'))
    expect(isRequirementMet(expr, completed)).toBe(true)
    expect(isRequirementMet(expr, new Set(['SBL0056']))).toBe(false)
  })

  it('grupos vazios: E vazio é cumprido, OU vazio não', () => {
    expect(isRequirementMet(and(), completed)).toBe(true)
    expect(isRequirementMet(or(), completed)).toBe(false)
  })

  describe('com equivalências', () => {
    // Cálculo I da EC exige ECO0001; o aluno cursou o equivalente EEL0001
    const equivalences: Equivalences = new Map([
      ['ECO0001', or(s('EEL0001'), s('CEC0058'))],
      ['ECO0010', and(s('MAT0001'), s('MAT0002'))],
      ['EEL0001', s('XYZ0001')],
    ])

    it('cumpre a disciplina por uma equivalente', () => {
      expect(
        isRequirementMet(s('ECO0001'), new Set(['EEL0001']), equivalences),
      ).toBe(true)
    })

    it('equivalência com E exige todas as disciplinas dela', () => {
      expect(
        isRequirementMet(s('ECO0010'), new Set(['MAT0001']), equivalences),
      ).toBe(false)
      expect(
        isRequirementMet(
          s('ECO0010'),
          new Set(['MAT0001', 'MAT0002']),
          equivalences,
        ),
      ).toBe(true)
    })

    it('não é transitiva', () => {
      // XYZ0001 equivale a EEL0001, que equivale a ECO0001, mas não vale para ECO0001
      expect(
        isRequirementMet(s('ECO0001'), new Set(['XYZ0001']), equivalences),
      ).toBe(false)
    })

    it('não é simétrica', () => {
      // ECO0001 lista EEL0001, mas EEL0001 não lista ECO0001
      expect(
        isRequirementMet(s('EEL0001'), new Set(['ECO0001']), equivalences),
      ).toBe(false)
    })

    it('isSubjectCompleted usa a mesma regra', () => {
      expect(
        isSubjectCompleted('ECO0001', new Set(['CEC0058']), equivalences),
      ).toBe(true)
      expect(isSubjectCompleted('ECO0001', new Set())).toBe(false)
    })
  })
})
