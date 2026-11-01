import { describe, expect, it } from 'vitest'

import { findRequirementCycles } from './find-requirement-cycles'
import type { RequirementExpr } from './types'

const s = (code: string): RequirementExpr => ({ kind: 'subject', code })
const or = (...items: RequirementExpr[]): RequirementExpr => ({
  kind: 'or',
  items,
})

describe('findRequirementCycles', () => {
  it('não acha ciclos numa cadeia normal', () => {
    const prerequisites = new Map<string, RequirementExpr | null>([
      ['A001', null],
      ['B001', s('A001')],
      ['C001', or(s('A001'), s('B001'))],
    ])
    expect(findRequirementCycles(prerequisites)).toEqual([])
  })

  it('acha uma disciplina que exige a si mesma', () => {
    expect(findRequirementCycles(new Map([['A001', s('A001')]]))).toEqual([
      ['A001'],
    ])
  })

  it('acha um ciclo direto', () => {
    const prerequisites = new Map([
      ['A001', s('B001')],
      ['B001', s('A001')],
    ])
    expect(findRequirementCycles(prerequisites)).toEqual([['A001', 'B001']])
  })

  it('acha um ciclo indireto, inclusive por um OU', () => {
    const prerequisites = new Map<string, RequirementExpr | null>([
      ['A001', s('C001')],
      ['B001', s('A001')],
      ['C001', or(s('X001'), s('B001'))],
      ['D001', s('A001')],
    ])
    expect(findRequirementCycles(prerequisites)).toEqual([
      ['A001', 'B001', 'C001'],
    ])
  })

  it('acha ciclos separados, em ordem', () => {
    const prerequisites = new Map([
      ['Z001', s('Y001')],
      ['Y001', s('Z001')],
      ['B001', s('A001')],
      ['A001', s('B001')],
    ])
    expect(findRequirementCycles(prerequisites)).toEqual([
      ['A001', 'B001'],
      ['Y001', 'Z001'],
    ])
  })

  it('ignora códigos que não estão no conjunto', () => {
    expect(findRequirementCycles(new Map([['A001', s('CEC0058')]]))).toEqual([])
  })
})
