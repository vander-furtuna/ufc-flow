import type { RequirementExpr } from './types'

// Escreve no formato do SIGAA, com parênteses em volta dos grupos internos:
// "( SBL0080 OU EEL0072 ) E SBL0056"
export function formatRequirement(expr: RequirementExpr): string {
  if (expr.kind === 'subject') return expr.code

  const separator = expr.kind === 'and' ? ' E ' : ' OU '
  return expr.items
    .map((item) =>
      item.kind === 'subject' ? item.code : `( ${formatRequirement(item)} )`,
    )
    .join(separator)
}
