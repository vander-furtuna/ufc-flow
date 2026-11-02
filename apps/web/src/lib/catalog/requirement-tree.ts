import {
  formatRequirement,
  normalizeRequirement,
  type RequirementExpr,
} from '@ufc-flow/academic-core'

// Árvore editável do editor de expressão E/OU (Admin-EC). Cada nó tem id
// estável para o React; a raiz é sempre um grupo. A conversão de volta passa
// pelo normalizeRequirement do academic-core (grupo vazio some, grupo de um
// item desembrulha).

export type ReqSubject = { id: string; kind: 'subject'; code: string }
export type ReqGroup = { id: string; kind: 'and' | 'or'; items: ReqNode[] }
export type ReqNode = ReqSubject | ReqGroup

function nodeFrom(expr: RequirementExpr, newId: () => string): ReqNode {
  if (expr.kind === 'subject') {
    return { id: newId(), kind: 'subject', code: expr.code }
  }
  return {
    id: newId(),
    kind: expr.kind,
    items: expr.items.map((item) => nodeFrom(item, newId)),
  }
}

export function treeFromExpr(
  expr: RequirementExpr | null,
  newId: () => string,
): ReqGroup {
  if (expr?.kind === 'and' || expr?.kind === 'or') {
    return nodeFrom(expr, newId) as ReqGroup
  }
  const root: ReqGroup = { id: newId(), kind: 'and', items: [] }
  if (expr) root.items.push(nodeFrom(expr, newId))
  return root
}

function toExpr(node: ReqNode): RequirementExpr {
  return node.kind === 'subject'
    ? { kind: 'subject', code: node.code }
    : { kind: node.kind, items: node.items.map(toExpr) }
}

export const exprFromTree = (root: ReqGroup): RequirementExpr | null =>
  normalizeRequirement(toExpr(root))

export const describeExpr = (expr: RequirementExpr | null) =>
  expr ? formatRequirement(expr) : '—'

// Aplica uma mudança no grupo com o id dado, em qualquer profundidade
function mapGroup(
  group: ReqGroup,
  id: string,
  change: (target: ReqGroup) => ReqGroup,
): ReqGroup {
  if (group.id === id) return change(group)
  return {
    ...group,
    items: group.items.map((item) =>
      item.kind === 'subject' ? item : mapGroup(item, id, change),
    ),
  }
}

export const setKind = (root: ReqGroup, groupId: string, kind: 'and' | 'or') =>
  mapGroup(root, groupId, (group) => ({ ...group, kind }))

export function addSubject(
  root: ReqGroup,
  groupId: string,
  rawCode: string,
  newId: () => string,
): ReqGroup {
  const code = rawCode.trim().toUpperCase()
  if (!code) return root
  return mapGroup(root, groupId, (group) =>
    group.items.some((item) => item.kind === 'subject' && item.code === code)
      ? group
      : {
          ...group,
          items: [...group.items, { id: newId(), kind: 'subject', code }],
        },
  )
}

// "+ Grupo": dentro de um TODAS (E) nasce um QUALQUER (OU), e vice-versa
export const addGroup = (
  root: ReqGroup,
  groupId: string,
  newId: () => string,
) =>
  mapGroup(root, groupId, (group) => ({
    ...group,
    items: [
      ...group.items,
      { id: newId(), kind: group.kind === 'and' ? 'or' : 'and', items: [] },
    ],
  }))

export function removeNode(root: ReqGroup, nodeId: string): ReqGroup {
  return {
    ...root,
    items: root.items
      .filter((item) => item.id !== nodeId)
      .map((item) =>
        item.kind === 'subject' ? item : removeNode(item, nodeId),
      ),
  }
}
