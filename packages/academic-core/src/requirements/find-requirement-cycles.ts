import { collectCodes } from './collect-codes'
import type { RequirementExpr } from './types'

// Grupos de disciplinas que dependem umas das outras em ciclo (componentes
// fortemente conexos de Tarjan). Cada grupo e a lista vêm em ordem alfabética.
// Códigos citados que não estão no conjunto não têm requisitos e não formam ciclo.
export function findRequirementCycles(
  prerequisites: ReadonlyMap<string, RequirementExpr | null>,
): string[][] {
  const edges = new Map<string, string[]>()
  for (const [code, expr] of prerequisites) {
    edges.set(
      code,
      collectCodes(expr).filter((required) => prerequisites.has(required)),
    )
  }

  const indexOf = new Map<string, number>()
  const lowLink = new Map<string, number>()
  const onStack = new Set<string>()
  const stack: string[] = []
  const cycles: string[][] = []
  let nextIndex = 0

  const visit = (code: string) => {
    indexOf.set(code, nextIndex)
    lowLink.set(code, nextIndex)
    nextIndex++
    stack.push(code)
    onStack.add(code)

    for (const required of edges.get(code) ?? []) {
      if (!indexOf.has(required)) {
        visit(required)
        lowLink.set(
          code,
          Math.min(lowLink.get(code) ?? 0, lowLink.get(required) ?? 0),
        )
      } else if (onStack.has(required)) {
        lowLink.set(
          code,
          Math.min(lowLink.get(code) ?? 0, indexOf.get(required) ?? 0),
        )
      }
    }

    if (lowLink.get(code) !== indexOf.get(code)) return

    const component: string[] = []
    let member: string | undefined
    do {
      member = stack.pop() as string
      onStack.delete(member)
      component.push(member)
    } while (member !== code)

    const isSelfLoop = edges.get(code)?.includes(code) ?? false
    if (component.length > 1 || isSelfLoop) cycles.push(component.sort())
  }

  for (const code of prerequisites.keys()) {
    if (!indexOf.has(code)) visit(code)
  }

  return cycles.sort((a, b) => (a[0] as string).localeCompare(b[0] as string))
}
