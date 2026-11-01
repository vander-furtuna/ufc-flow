import { parseRequirement, type RequirementExpr } from '@ufc-flow/academic-core'
import { describe, expect, expectTypeOf, it } from 'vitest'
import type { z } from 'zod'

import { requirementExprSchema } from './requirement-expr'

const s = (code: string): RequirementExpr => ({ kind: 'subject', code })

const parsed = (text: string) => {
  const result = parseRequirement(text)
  if (!result.ok || !result.expr) throw new Error(`Requisito inválido: ${text}`)
  return result.expr
}

describe('requirementExprSchema', () => {
  it('tem o tipo do academic-core', () => {
    expectTypeOf<
      z.infer<typeof requirementExprSchema>
    >().toEqualTypeOf<RequirementExpr>()
  })

  it('aceita uma disciplina', () => {
    expect(requirementExprSchema.safeParse(s('SBL0080')).success).toBe(true)
  })

  it('aceita o que o parser do academic-core gera', () => {
    const expr = parsed('( SBL0080 OU EEL0072 ) E ( SBL0056 ) E ( SBL0086 )')
    expect(requirementExprSchema.parse(expr)).toEqual(expr)
  })

  it('recusa código inválido em qualquer nível', () => {
    const result = requirementExprSchema.safeParse({
      kind: 'and',
      items: [s('SBL0080'), { kind: 'or', items: [s('SBL0056'), s('sbl')] }],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual([
      'items',
      1,
      'items',
      1,
      'code',
    ])
  })

  it('recusa tipo de nó desconhecido', () => {
    expect(
      requirementExprSchema.safeParse({ kind: 'not', items: [s('SBL0080')] })
        .success,
    ).toBe(false)
  })

  describe('só aceita a forma normalizada (D21)', () => {
    it.each([
      ['grupo vazio', { kind: 'and', items: [] }],
      ['grupo de um item', { kind: 'or', items: [s('SBL0080')] }],
      [
        'E dentro de E',
        {
          kind: 'and',
          items: [s('SBL0080'), { kind: 'and', items: [s('A1'), s('B1')] }],
        },
      ],
      ['item repetido', { kind: 'or', items: [s('SBL0080'), s('SBL0080')] }],
    ])('%s', (_, expr) => {
      const result = requirementExprSchema.safeParse(expr)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toMatch(/normalizada/)
    })
  })
})
