import { collectCodes, findRequirementCycles } from '@ufc-flow/academic-core'
import type { PublicationCheck, PublicationIssue } from '@ufc-flow/contracts'

import type { Branch, Curriculum } from './curriculum'
import { isBlocking, type ReviewPoint } from './review-points'

const issue = (
  code: string,
  message: string,
  subjectCode: string | null = null,
): PublicationIssue => ({ code, message, subjectCode })

// Só grupo de componentes fica dentro de outra vertente, e a mãe é uma
// ênfase (D37). Vertentes do Flow (SLOPE) e ênfases ficam na raiz.
function hierarchyIssues(branches: readonly Branch[]): PublicationIssue[] {
  const byId = new Map(branches.map((branch) => [branch.id, branch]))
  return branches.flatMap((branch) => {
    if (branch.parentId === null) return []
    const parent = byId.get(branch.parentId)
    if (branch.type === 'SPECIFIC_GROUP' && parent?.type === 'EMPHASIS') {
      return []
    }
    return [
      issue(
        'BRANCH_INVALID_PARENT',
        `A vertente ${branch.name} só pode ficar dentro de uma ênfase se for um grupo de componentes`,
      ),
    ]
  })
}

// Roda antes de publicar (passo 7 do fluxo de importação): erros barram a
// publicação, avisos só aparecem para quem revisa.
export function checkPublication(
  curriculum: Curriculum,
  ctx: {
    // Códigos que existem no catálogo global
    knownCodes: ReadonlySet<string>
    reviewPoints: readonly ReviewPoint[]
  },
): PublicationCheck {
  const errors: PublicationIssue[] = []
  const warnings: PublicationIssue[] = []
  const inCurriculum = new Set(curriculum.subjects.map((item) => item.code))

  if (curriculum.subjects.length === 0) {
    errors.push(issue('NO_SUBJECTS', 'A estrutura não tem disciplinas'))
  }

  errors.push(...hierarchyIssues(curriculum.branches))

  const cycles = findRequirementCycles(
    new Map(curriculum.subjects.map((item) => [item.code, item.prerequisites])),
  )
  for (const cycle of cycles) {
    errors.push(
      issue(
        'REQUIREMENT_CYCLE',
        `Pré-requisitos em ciclo: ${cycle.join(', ')}`,
        cycle[0] ?? null,
      ),
    )
  }

  for (const point of ctx.reviewPoints) {
    if (isBlocking(point)) {
      errors.push(
        issue(
          'UNRESOLVED_REVIEW_POINT',
          `Ponto para revisar em ${point.code}`,
          point.code,
        ),
      )
    } else if (point.resolution === null) {
      warnings.push(
        issue(
          'PENDING_EQUIVALENCE_SUGGESTION',
          `Equivalências sugeridas para ${point.code} esperam um administrador`,
          point.code,
        ),
      )
    }
  }

  // Requisito que cita código fora da EC e do catálogo fica como texto: é
  // sinalizado, não barra
  for (const subject of curriculum.subjects) {
    const cited = new Set([
      ...collectCodes(subject.prerequisites),
      ...collectCodes(subject.corequisites),
    ])
    for (const code of cited) {
      if (inCurriculum.has(code) || ctx.knownCodes.has(code)) continue
      warnings.push(
        issue(
          'UNKNOWN_REQUIREMENT_CODE',
          `${subject.code} cita ${code}, que não está no catálogo`,
          subject.code,
        ),
      )
    }
  }

  for (const branch of curriculum.branches) {
    const used = curriculum.subjects.some((subject) =>
      subject.branches.some((link) => link.branchId === branch.id),
    )
    const hasChildren = curriculum.branches.some(
      (item) => item.parentId === branch.id,
    )
    if (!used && !hasChildren) {
      warnings.push(
        issue('EMPTY_BRANCH', `A vertente ${branch.name} não tem disciplinas`),
      )
    }
  }

  return { canPublish: errors.length === 0, errors, warnings }
}
