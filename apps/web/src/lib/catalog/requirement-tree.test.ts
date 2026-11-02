import type { RequirementExpr } from '@ufc-flow/academic-core'
import { describe, expect, it } from 'vitest'

import {
  addGroup,
  addSubject,
  describeExpr,
  exprFromTree,
  removeNode,
  setKind,
  treeFromExpr,
  type ReqGroup,
} from './requirement-tree'

function ids() {
  let next = 0
  return () => `n${++next}`
}

const s = (code: string): RequirementExpr => ({ kind: 'subject', code })

// SBL0084 E (ECO0018 OU CEC0022), o exemplo do Admin-EC
const example: RequirementExpr = {
  kind: 'and',
  items: [s('SBL0084'), { kind: 'or', items: [s('ECO0018'), s('CEC0022')] }],
}

describe('treeFromExpr e exprFromTree', () => {
  it('ida e volta preservam a expressão', () => {
    const tree = treeFromExpr(example, ids())
    expect(tree.kind).toBe('and')
    expect(tree.items).toHaveLength(2)
    expect(exprFromTree(tree)).toEqual(example)
  })

  it('sem requisito vira um grupo E vazio, e grupo vazio volta como null', () => {
    const tree = treeFromExpr(null, ids())
    expect(tree).toEqual({ id: 'n1', kind: 'and', items: [] })
    expect(exprFromTree(tree)).toBeNull()
  })

  it('código solto fica dentro de um grupo E', () => {
    const tree = treeFromExpr(s('ECO0001'), ids())
    expect(tree.items).toEqual([{ id: 'n2', kind: 'subject', code: 'ECO0001' }])
    expect(exprFromTree(tree)).toEqual(s('ECO0001'))
  })
})

describe('edição', () => {
  const start = () => {
    const newId = ids()
    return { newId, tree: treeFromExpr(example, newId) }
  }
  const inner = (tree: ReqGroup) => tree.items[1] as ReqGroup

  it('troca TODAS (E) por QUALQUER (OU) num grupo', () => {
    const { tree } = start()
    expect(describeExpr(exprFromTree(setKind(tree, tree.id, 'or')))).toBe(
      'SBL0084 OU ECO0018 OU CEC0022',
    )
  })

  it('acrescenta disciplina em maiúsculas e ignora repetida no grupo', () => {
    const { tree, newId } = start()
    const withCode = addSubject(tree, inner(tree).id, ' eco0099 ', newId)
    expect(describeExpr(exprFromTree(withCode))).toBe(
      'SBL0084 E ( ECO0018 OU CEC0022 OU ECO0099 )',
    )
    expect(addSubject(withCode, inner(tree).id, 'ECO0099', newId)).toEqual(
      withCode,
    )
    expect(addSubject(tree, tree.id, '  ', newId)).toEqual(tree)
  })

  it('grupo novo nasce com o tipo oposto ao da mãe', () => {
    const { tree, newId } = start()
    const next = addGroup(tree, tree.id, newId)
    expect(next.items.at(-1)).toMatchObject({ kind: 'or', items: [] })
    // Grupo vazio some da expressão
    expect(exprFromTree(next)).toEqual(example)
    expect(addGroup(next, inner(next).id, newId).items[1]).toMatchObject({
      items: [expect.anything(), expect.anything(), { kind: 'and' }],
    })
  })

  it('remove disciplina ou grupo inteiro', () => {
    const { tree } = start()
    expect(describeExpr(exprFromTree(removeNode(tree, inner(tree).id)))).toBe(
      'SBL0084',
    )
    const code = inner(tree).items[0]!.id
    expect(describeExpr(exprFromTree(removeNode(tree, code)))).toBe(
      'SBL0084 E CEC0022',
    )
  })
})

describe('describeExpr', () => {
  it('escreve como o SIGAA, com traço quando não há requisito', () => {
    expect(describeExpr(example)).toBe('SBL0084 E ( ECO0018 OU CEC0022 )')
    expect(describeExpr(null)).toBe('—')
  })
})
