import type { RequirementExpr } from './types'

// Forma canônica da árvore: grupos do mesmo tipo achatados, grupos vazios
// descartados, grupos de um item desembrulhados e itens repetidos removidos.
// Devolve null quando não sobra requisito.
export function normalizeRequirement(
  expr: RequirementExpr,
): RequirementExpr | null {
  if (expr.kind === 'subject') return expr

  const items: RequirementExpr[] = []
  const seen = new Set<string>()

  for (const item of expr.items) {
    const normalized = normalizeRequirement(item)
    if (!normalized) continue

    const parts =
      normalized.kind !== 'subject' && normalized.kind === expr.kind
        ? normalized.items
        : [normalized]

    for (const part of parts) {
      const key = JSON.stringify(part)
      if (seen.has(key)) continue
      seen.add(key)
      items.push(part)
    }
  }

  if (items.length === 0) return null
  if (items.length === 1) return items[0] as RequirementExpr
  return { kind: expr.kind, items }
}
