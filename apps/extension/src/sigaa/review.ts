import {
  collectCodes,
  findRequirementCycles,
  type RequirementExpr,
} from '@ufc-flow/academic-core'
import type { CurriculumImportV1, ValidationError } from '@ufc-flow/contracts'

import type { CourseResolution } from './course'
import type { ConversionWarning } from './to-curriculum-import'

export type ReviewLevel = 'ok' | 'warning' | 'error'

// Um item da aba Revisar: o que a extensão entendeu da página, antes de o
// JSON sair do navegador
export type ReviewItem = {
  id: string
  level: ReviewLevel
  title: string
  detail: string
  codes?: string[]
}

const RECOGNITION_TITLES = {
  SELECTED: 'Curso selecionado na busca do SIGAA',
  MATCHED: 'Curso reconhecido pelo cabeçalho',
  MANUAL: 'Curso escolhido por você',
} as const

function courseItem({
  course,
  recognition,
  candidates,
  match,
}: CourseResolution): ReviewItem {
  if (course && recognition) {
    return {
      id: 'course',
      level: 'ok',
      title: RECOGNITION_TITLES[recognition],
      detail: `${course.name} · ${course.city} · código SIGAA ${course.sigaaId}`,
    }
  }
  const detail =
    match.status === 'MATCHED'
      ? 'O curso selecionado na busca do SIGAA não bate com o cabeçalho desta estrutura'
      : candidates.length === 0
        ? 'Nenhum curso do SIGAA corresponde a esta matriz'
        : match.status === 'NOT_FOUND'
          ? `${candidates.length} cursos possíveis na mesma cidade`
          : `${candidates.length} cursos possíveis`
  return {
    id: 'course',
    level: 'error',
    title: 'Escolha o curso desta estrutura',
    detail,
  }
}

const hasOr = (expr: RequirementExpr | null): boolean =>
  expr !== null &&
  expr.kind !== 'subject' &&
  (expr.kind === 'or' || expr.items.some(hasOr))

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`

const WARNING_ITEMS: Record<
  ConversionWarning['code'],
  { id: string; title: string; detail: string }
> = {
  REQUIREMENT_UNREADABLE: {
    id: 'unreadable-requirements',
    title: 'Requisitos que a extensão não entendeu',
    detail: 'Vão vazios. Confira no SIGAA e corrija no editor do Flow.',
  },
  UNKNOWN_SUBJECT_TYPE: {
    id: 'unknown-types',
    title: 'Tipos de componente desconhecidos',
    detail: 'Vão como "outro". Corrija no editor do Flow, se precisar.',
  },
  BRANCH_MEMBER_OUTSIDE: {
    id: 'branch-members-outside',
    title: 'Disciplinas de vertente fora das tabelas de componentes',
    detail: 'O vínculo com a vertente foi ignorado.',
  },
}

export function reviewImport({
  data,
  issues,
  warnings,
  course,
}: {
  data: CurriculumImportV1 | null
  issues: ValidationError[]
  warnings: ConversionWarning[]
  course: CourseResolution
}): ReviewItem[] {
  const items: ReviewItem[] = [courseItem(course)]

  if (!data) {
    items.push({
      id: 'validation',
      level: 'error',
      title: 'O JSON não passou no CurriculumImportV1',
      detail: issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; '),
    })
    return items
  }

  const { subjects, branches } = data
  const mandatory = subjects.filter((item) => item.nature === 'MANDATORY')
  const periods = Math.max(0, ...mandatory.map((item) => item.semester ?? 0))
  items.push({
    id: 'components',
    level: 'ok',
    title: `${plural(subjects.length, 'componente', 'componentes')} em ${plural(periods, 'período', 'períodos')}`,
    detail: `${mandatory.length} obrigatórias · ${subjects.length - mandatory.length} optativas`,
  })

  const cycles = findRequirementCycles(
    new Map(subjects.map((item) => [item.code, item.prerequisites])),
  )
  const withPrerequisites = subjects.filter((item) => item.prerequisites)
  items.push({
    id: 'requirements',
    level: cycles.length > 0 ? 'warning' : 'ok',
    title: 'Requisitos lidos como expressão',
    detail: [
      `${withPrerequisites.length} disciplinas com pré-requisito`,
      `${withPrerequisites.filter((item) => hasOr(item.prerequisites)).length} usam OU`,
      cycles.length === 0
        ? 'nenhum ciclo encontrado'
        : cycles.map((cycle) => `ciclo: ${cycle.join(' ↔ ')}`).join(' · '),
    ].join(' · '),
  })

  const emphases = branches.filter((item) => item.type === 'EMPHASIS').length
  items.push(
    branches.length === 0
      ? {
          id: 'branches',
          level: 'ok',
          title: 'Sem ênfases nem grupos',
          detail: 'A página do SIGAA não traz vertentes para esta estrutura.',
        }
      : {
          id: 'branches',
          level: 'ok',
          title: `${plural(emphases, 'ênfase', 'ênfases')} e ${plural(branches.length - emphases, 'grupo', 'grupos')}`,
          detail: branches.map((item) => item.name).join(', '),
        },
  )

  const codes = new Set(subjects.map((item) => item.code))
  const outside = [
    ...new Set(
      subjects.flatMap((item) => [
        ...collectCodes(item.prerequisites),
        ...collectCodes(item.corequisites),
      ]),
    ),
  ]
    .filter((code) => !codes.has(code))
    .sort()
  if (outside.length > 0) {
    items.push({
      id: 'outside',
      level: 'warning',
      title: `${plural(outside.length, 'código citado', 'códigos citados')} fora desta estrutura`,
      detail:
        'Aparecem em pré ou co-requisitos. Vão como código, e o Flow liga quando forem importados.',
      codes: outside,
    })
  }

  for (const [code, item] of Object.entries(WARNING_ITEMS)) {
    const found = warnings.filter((warning) => warning.code === code)
    if (found.length === 0) continue
    items.push({
      ...item,
      level: 'warning',
      codes: [...new Set(found.map((warning) => warning.subjectCode))],
    })
  }

  return items
}

export const canExport = (items: readonly ReviewItem[]) =>
  items.every((item) => item.level !== 'error')
