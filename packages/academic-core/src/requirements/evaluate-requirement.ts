import type { RequirementExpr } from './types'

// Equivalências globais por código: a disciplina-chave é cumprida por quem
// satisfaz a expressão. Valem só na direção gravada (não são simétricas) e
// não se encadeiam (não são transitivas), como no SIGAA.
export type Equivalences = ReadonlyMap<string, RequirementExpr>

function evaluate(
  expr: RequirementExpr,
  isMet: (code: string) => boolean,
): boolean {
  switch (expr.kind) {
    case 'subject':
      return isMet(expr.code)
    case 'and':
      return expr.items.every((item) => evaluate(item, isMet))
    case 'or':
      return expr.items.some((item) => evaluate(item, isMet))
  }
}

// Cumprida se o código está entre os concluídos (APROVADO ou APROVEITADA)
// ou se a equivalência dele é satisfeita diretamente pelos concluídos
export function isSubjectCompleted(
  code: string,
  completed: ReadonlySet<string>,
  equivalences?: Equivalences,
): boolean {
  if (completed.has(code)) return true
  const equivalence = equivalences?.get(code)
  return (
    equivalence !== undefined &&
    evaluate(equivalence, (equivalentCode) => completed.has(equivalentCode))
  )
}

export function isRequirementMet(
  expr: RequirementExpr | null,
  completed: ReadonlySet<string>,
  equivalences?: Equivalences,
): boolean {
  if (!expr) return true
  return evaluate(expr, (code) =>
    isSubjectCompleted(code, completed, equivalences),
  )
}
