import { collectCodes } from './collect-codes'
import type { RequirementExpr } from './types'

// O que cada disciplina libera: para cada código citado num requisito, as
// disciplinas que o citam, na ordem do mapa. É direto (sem encadear) e conta
// também quem cita o código só num dos lados de um OU.
export function findDependents(
  requirements: ReadonlyMap<string, RequirementExpr | null>,
): Map<string, string[]> {
  const dependents = new Map<string, string[]>()
  for (const [code, expr] of requirements) {
    for (const required of collectCodes(expr)) {
      if (required === code) continue
      const list = dependents.get(required) ?? []
      list.push(code)
      dependents.set(required, list)
    }
  }
  return dependents
}
