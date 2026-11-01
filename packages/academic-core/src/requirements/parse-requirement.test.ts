import { describe, expect, it } from 'vitest'

import { formatRequirement } from './format-requirement'
import { parseRequirement } from './parse-requirement'
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

function parsed(text: string) {
  const result = parseRequirement(text)
  if (!result.ok) throw new Error(result.error.message)
  return result.expr
}

describe('parseRequirement', () => {
  describe('textos reais do SIGAA', () => {
    it('lê uma única disciplina entre parênteses', () => {
      expect(parsed('( SBL0057 )')).toEqual(s('SBL0057'))
    })

    it('lê uma lista de OU', () => {
      expect(parsed('( ECO0001 OU EEL0001 OU CEC0058 )')).toEqual(
        or(s('ECO0001'), s('EEL0001'), s('CEC0058')),
      )
    })

    it('lê uma lista de E', () => {
      expect(parsed('( ECO0016 E ECO0020 E ECO0025 )')).toEqual(
        and(s('ECO0016'), s('ECO0020'), s('ECO0025')),
      )
    })

    it('lê grupos ligados por E', () => {
      expect(
        parsed('( SBL0080 OU EEL0072 ) E ( SBL0056 ) E ( SBL0086 )'),
      ).toEqual(and(or(s('SBL0080'), s('EEL0072')), s('SBL0056'), s('SBL0086')))
    })

    it('lê parênteses aninhados', () => {
      expect(parsed('( ECO0018 E ( SBL0084 OU CEC0022 ) )')).toEqual(
        and(s('ECO0018'), or(s('SBL0084'), s('CEC0022'))),
      )
    })
  })

  describe('precedência e normalização', () => {
    it('E vem antes de OU sem parênteses', () => {
      expect(parsed('A001 E B001 OU C001')).toEqual(
        or(and(s('A001'), s('B001')), s('C001')),
      )
      expect(parsed('A001 OU B001 E C001')).toEqual(
        or(s('A001'), and(s('B001'), s('C001'))),
      )
    })

    it('achata grupos do mesmo tipo', () => {
      expect(parsed('( A001 E ( B001 E C001 ) ) E D001')).toEqual(
        and(s('A001'), s('B001'), s('C001'), s('D001')),
      )
    })

    it('remove parênteses redundantes', () => {
      expect(parsed('((( A001 )))')).toEqual(s('A001'))
    })

    it('remove códigos repetidos no mesmo grupo', () => {
      expect(parsed('A001 OU A001 OU B001')).toEqual(or(s('A001'), s('B001')))
      expect(parsed('A001 E A001')).toEqual(s('A001'))
    })

    it('aceita parênteses colados, espaços extras e operadores minúsculos', () => {
      expect(parsed('  (ECO0001  ou EEL0001)e\tSBL0056 ')).toEqual(
        and(or(s('ECO0001'), s('EEL0001')), s('SBL0056')),
      )
    })

    it('trata texto vazio como sem requisito', () => {
      expect(parsed('')).toBeNull()
      expect(parsed('   ')).toBeNull()
    })
  })

  describe('erros de sintaxe', () => {
    it.each([
      ['( ECO0001 OU', 'REQUIREMENT_UNEXPECTED_END', 12],
      ['ECO0001 OU OU EEL0001', 'REQUIREMENT_UNEXPECTED_TOKEN', 11],
      ['( ECO0001', 'REQUIREMENT_UNEXPECTED_END', 9],
      ['ECO0001 )', 'REQUIREMENT_UNEXPECTED_TOKEN', 8],
      ['ECO0001 EEL0001', 'REQUIREMENT_UNEXPECTED_TOKEN', 8],
      ['()', 'REQUIREMENT_UNEXPECTED_TOKEN', 1],
      ['eco0001', 'REQUIREMENT_INVALID_TOKEN', 0],
      ['ECO0001 OU ECO-12', 'REQUIREMENT_INVALID_TOKEN', 11],
    ])('rejeita %j', (text, code, position) => {
      const result = parseRequirement(text)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.code).toBe(code)
      expect(result.error.position).toBe(position)
      expect(result.error.message).not.toBe('')
    })
  })
})

describe('formatRequirement', () => {
  it('escreve no formato do SIGAA, com parênteses nos grupos internos', () => {
    expect(
      formatRequirement(
        and(or(s('SBL0080'), s('EEL0072')), s('SBL0056'), s('SBL0086')),
      ),
    ).toBe('( SBL0080 OU EEL0072 ) E SBL0056 E SBL0086')
  })

  it('escreve uma disciplina sozinha sem parênteses', () => {
    expect(formatRequirement(s('SBL0057'))).toBe('SBL0057')
  })

  it.each([
    '( ECO0001 OU EEL0001 OU CEC0058 )',
    '( SBL0080 OU EEL0072 ) E ( SBL0056 ) E ( SBL0086 )',
    '( ECO0018 E ( SBL0084 OU CEC0022 ) )',
    'A001 E B001 OU C001 E ( D001 OU E001 E F001 )',
  ])('volta à mesma árvore depois de formatar %j', (text) => {
    const expr = parsed(text)
    expect(expr).not.toBeNull()
    expect(parsed(formatRequirement(expr as RequirementExpr))).toEqual(expr)
  })
})
