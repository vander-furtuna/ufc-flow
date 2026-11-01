import type { RequirementExpr } from './types'

// Códigos citados na expressão, na ordem e sem repetição
export function collectCodes(expr: RequirementExpr | null): string[] {
  const codes = new Set<string>()

  const visit = (node: RequirementExpr) => {
    if (node.kind === 'subject') codes.add(node.code)
    else node.items.forEach(visit)
  }

  if (expr) visit(expr)
  return [...codes]
}
