import { describe, expect, it } from 'vitest'

import { findDependents } from './find-dependents'
import { parseRequirement } from './parse-requirement'
import type { RequirementExpr } from './types'

const req = (text: string): RequirementExpr | null => {
  const result = parseRequirement(text)
  if (!result.ok) throw new Error(text)
  return result.expr
}

describe('findDependents', () => {
  // Trecho real da Eng. de Computação 2006.2
  const prerequisites = new Map([
    ['SBL0086', null],
    ['ECO0015', req('( ECO0004 OU SBL0086 )')],
    ['ECO0018', req('( ECO0015 )')],
    ['SBL0117', req('( SBL0080 OU EEL0072 ) E ( SBL0056 ) E ( SBL0086 )')],
  ])

  it('lista quem cita cada disciplina como requisito, na ordem da EC', () => {
    const dependents = findDependents(prerequisites)
    expect(dependents.get('SBL0086')).toEqual(['ECO0015', 'SBL0117'])
    expect(dependents.get('ECO0015')).toEqual(['ECO0018'])
  })

  it('conta também quem libera só por um dos lados de um OU', () => {
    expect(findDependents(prerequisites).get('ECO0004')).toEqual(['ECO0015'])
  })

  it('inclui códigos citados que não estão na EC', () => {
    expect(findDependents(prerequisites).get('EEL0072')).toEqual(['SBL0117'])
  })

  it('não lista disciplina que não libera nada', () => {
    expect(findDependents(prerequisites).has('ECO0018')).toBe(false)
  })

  it('é direto, sem encadear', () => {
    expect(findDependents(prerequisites).get('SBL0086')).not.toContain(
      'ECO0018',
    )
  })

  it('ignora a disciplina citada como requisito de si mesma', () => {
    const selfLoop = new Map([['A1', req('A1 OU B1')]])
    expect(findDependents(selfLoop).get('A1')).toBeUndefined()
    expect(findDependents(selfLoop).get('B1')).toEqual(['A1'])
  })

  it('devolve vazio sem requisitos', () => {
    expect(findDependents(new Map()).size).toBe(0)
  })
})
