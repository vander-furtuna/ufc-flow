import {
  collectCodes,
  formatRequirement,
  normalizeSearchText,
  type RequirementExpr,
} from '@ufc-flow/academic-core'
import type { CurriculumDiff, CurriculumImportV1 } from '@ufc-flow/contracts'

import {
  addSubject,
  createBranch,
  curriculumSlug,
  removeBranch,
  removeSubject,
  updateBranch,
  updateHeader,
  updateSubject,
  type Branch,
  type BranchLink,
  type Curriculum,
  type CurriculumSubject,
  type EditContext,
} from './curriculum'
import type { ReviewPoint } from './review-points'
import {
  newSubject,
  sameWorkload,
  subjectWorkload,
  type Subject,
} from './subject'

export type ImportPlan = {
  // Códigos que ainda não existem no catálogo global
  newSubjects: Subject[]
  reviewPoints: ReviewPoint[]
  // Importação de admin aplica as equivalências direto (D5)
  equivalenceUpdates: { code: string; equivalences: RequirementExpr | null }[]
}

const sameValue = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b)

// Disciplinas reaproveitadas pelo código; divergência de nome ou carga vira
// ponto para revisar, sem sobrescrever o catálogo (passo 4 do fluxo).
export function planImport(
  payload: CurriculumImportV1,
  ctx: {
    catalog: ReadonlyMap<string, Subject>
    importId: string
    importedByAdmin: boolean
    newId: () => string
    now: Date
  },
): ImportPlan {
  const plan: ImportPlan = {
    newSubjects: [],
    reviewPoints: [],
    equivalenceUpdates: [],
  }
  const base = { importId: ctx.importId, resolvedAt: null, resolution: null }
  const inFile = new Set(payload.subjects.map((item) => item.code))

  for (const item of payload.subjects) {
    const existing = ctx.catalog.get(item.code)
    if (!existing) {
      plan.newSubjects.push(
        newSubject(
          {
            id: ctx.newId(),
            code: item.code,
            name: item.name,
            type: item.type,
            durationTerms: item.durationTerms,
            ...subjectWorkload(item),
          },
          ctx.now,
        ),
      )
    } else {
      if (existing.name !== item.name) {
        plan.reviewPoints.push({
          ...base,
          key: `name:${item.code}`,
          code: item.code,
          type: 'SUBJECT_NAME_MISMATCH',
          catalogName: existing.name,
          importedName: item.name,
        })
      }
      if (!sameWorkload(existing, item)) {
        plan.reviewPoints.push({
          ...base,
          key: `workload:${item.code}`,
          code: item.code,
          type: 'SUBJECT_WORKLOAD_MISMATCH',
          catalog: subjectWorkload(existing),
          imported: subjectWorkload(item),
        })
      }
    }

    const current = existing?.equivalences ?? null
    if (!sameValue(item.equivalences, current)) {
      if (ctx.importedByAdmin) {
        plan.equivalenceUpdates.push({
          code: item.code,
          equivalences: item.equivalences,
        })
      } else if (item.equivalences !== null) {
        plan.reviewPoints.push({
          ...base,
          key: `equivalences:${item.code}`,
          code: item.code,
          type: 'EQUIVALENCES_SUGGESTED',
          suggested: item.equivalences,
          current,
        })
      }
    }

    const cited = new Set([
      ...collectCodes(item.prerequisites),
      ...collectCodes(item.corequisites),
    ])
    for (const code of cited) {
      if (inFile.has(code) || ctx.catalog.has(code)) continue
      plan.reviewPoints.push({
        ...base,
        key: `unknown:${item.code}:${code}`,
        code: item.code,
        type: 'UNKNOWN_REQUIREMENT_CODE',
        requiredCode: code,
      })
    }
  }
  return plan
}

// EC em rascunho a partir do arquivo. As chaves locais das vertentes
// (emphasis-<slug>) viram UUIDs (passo 5).
export function curriculumFromImport(
  payload: CurriculumImportV1,
  ctx: {
    id: string
    courseId: string
    subjectIdOf: (code: string) => string
    newId: () => string
    now: Date
  },
): Curriculum {
  const branchIds = new Map(
    payload.branches.map((branch) => [branch.key, ctx.newId()]),
  )
  const idOf = (key: string) => branchIds.get(key) as string
  const { city: _, ...header } = payload.curriculum

  return {
    id: ctx.id,
    courseId: ctx.courseId,
    header: { ...header, slug: curriculumSlug(header.code) },
    status: 'DRAFT',
    isCurrent: false,
    needsReimport: false,
    publishedAt: null,
    publishedBy: null,
    createdAt: ctx.now,
    updatedAt: ctx.now,
    branches: payload.branches.map(({ key, parentKey, ...branch }, index) => ({
      ...branch,
      id: idOf(key),
      parentId: parentKey === null ? null : idOf(parentKey),
      position: index,
    })),
    subjects: payload.subjects.map((item) => ({
      id: ctx.newId(),
      subjectId: ctx.subjectIdOf(item.code),
      code: item.code,
      semester: item.semester,
      nature: item.nature,
      prerequisites: item.prerequisites,
      corequisites: item.corequisites,
      branches: item.branches.map((link) => ({
        branchId: idOf(link.key),
        nature: link.nature,
      })),
    })),
  }
}

// Mesma vertente nos dois lados: mesmo tipo e mesmo código do SIGAA, ou
// mesmo nome quando não há código (vertentes do Flow e grupos)
const branchIdentity = (branch: Branch) =>
  `${branch.type}:${branch.sigaaCode ?? normalizeSearchText(branch.name).trim()}`

type BranchMatch = {
  // Vertente do arquivo -> vertente que já existe
  toCurrent: Map<string, string>
  // Vertentes do Flow (SLOPE) que o SIGAA não mostra: ficam, com os vínculos
  kept: Set<string>
  removed: Branch[]
}

function matchBranches(current: Curriculum, incoming: Curriculum): BranchMatch {
  const byIdentity = new Map(
    current.branches.map((branch) => [branchIdentity(branch), branch]),
  )
  const toCurrent = new Map<string, string>()
  for (const branch of incoming.branches) {
    const match = byIdentity.get(branchIdentity(branch))
    if (match) toCurrent.set(branch.id, match.id)
  }
  const matched = new Set(toCurrent.values())
  const unmatched = current.branches.filter((branch) => !matched.has(branch.id))
  return {
    toCurrent,
    kept: new Set(
      unmatched.filter((item) => item.type === 'SLOPE').map((item) => item.id),
    ),
    removed: unmatched.filter((item) => item.type !== 'SLOPE'),
  }
}

const remap = (match: BranchMatch, id: string) => match.toCurrent.get(id) ?? id

// Vínculos que a disciplina terá depois de aplicar: os do arquivo, com as
// vertentes já existentes, mais os das vertentes do Flow que ficam
function targetLinks(
  match: BranchMatch,
  incoming: CurriculumSubject,
  current: CurriculumSubject | undefined,
): BranchLink[] {
  return [
    ...incoming.branches.map((link) => ({
      ...link,
      branchId: remap(match, link.branchId),
    })),
    ...(current?.branches.filter((link) => match.kept.has(link.branchId)) ??
      []),
  ]
}

// Mães antes das filhas, para criar na ordem certa
function byDepth(branches: readonly Branch[]): Branch[] {
  const byId = new Map(branches.map((branch) => [branch.id, branch]))
  const depth = (branch: Branch): number => {
    const parent = branch.parentId ? byId.get(branch.parentId) : undefined
    return parent ? depth(parent) + 1 : 0
  }
  return [...branches].sort((a, b) => depth(a) - depth(b))
}

const describeRequirement = (expr: RequirementExpr | null) =>
  expr === null ? null : formatRequirement(expr)

const BRANCH_FIELDS = [
  'name',
  'description',
  'sigaaCode',
  'color',
  'mandatoryHours',
  'minHours',
  'maxHours',
  'minComponents',
  'maxComponents',
] as const

// Diferenças entre a EC que existe e a do arquivo, para quem vai aplicar
// conferir antes (passo 6)
export function diffCurriculum(
  current: Curriculum,
  incoming: Curriculum,
): CurriculumDiff {
  const match = matchBranches(current, incoming)
  const branchName = new Map(
    [...current.branches, ...incoming.branches].map((branch) => [
      remap(match, branch.id),
      branch.name,
    ]),
  )
  // Nomes dos vínculos pelo lado atual, quando a vertente já existe
  for (const branch of current.branches) branchName.set(branch.id, branch.name)

  const header = (
    Object.keys(incoming.header) as (keyof Curriculum['header'])[]
  )
    // O endereço é do Flow (pode ter sido editado); o arquivo não o muda
    .filter(
      (field) =>
        field !== 'slug' &&
        !sameValue(current.header[field], incoming.header[field]),
    )
    .map((field) => ({
      field,
      before: current.header[field],
      after: incoming.header[field],
    }))

  const currentBranches = new Map(
    current.branches.map((item) => [item.id, item]),
  )
  const branches: CurriculumDiff['branches'] = {
    added: [],
    removed: match.removed.map((branch) => branch.name),
    changed: [],
  }
  for (const branch of incoming.branches) {
    const existing = currentBranches.get(remap(match, branch.id))
    if (!existing) {
      branches.added.push(branch.name)
      continue
    }
    const fields: CurriculumDiff['header'] = BRANCH_FIELDS.filter(
      (field) => existing[field] !== branch[field],
    ).map((field) => ({ field, before: existing[field], after: branch[field] }))
    const parentBefore = existing.parentId
    const parentAfter = branch.parentId ? remap(match, branch.parentId) : null
    if (parentBefore !== parentAfter) {
      fields.push({
        field: 'parent',
        before: parentBefore ? (branchName.get(parentBefore) ?? null) : null,
        after: parentAfter ? (branchName.get(parentAfter) ?? null) : null,
      })
    }
    if (fields.length > 0) branches.changed.push({ key: existing.name, fields })
  }

  const linksText = (links: readonly BranchLink[]) =>
    links
      .map((link) => `${branchName.get(link.branchId) ?? '?'} (${link.nature})`)
      .sort()

  const currentSubjects = new Map(
    current.subjects.map((item) => [item.code, item]),
  )
  const incomingCodes = new Set(incoming.subjects.map((item) => item.code))
  const subjects: CurriculumDiff['subjects'] = {
    added: [],
    removed: current.subjects
      .filter((item) => !incomingCodes.has(item.code))
      .map((item) => item.code),
    changed: [],
  }
  for (const item of incoming.subjects) {
    const existing = currentSubjects.get(item.code)
    if (!existing) {
      subjects.added.push(item.code)
      continue
    }
    const pairs: [string, unknown, unknown][] = [
      ['semester', existing.semester, item.semester],
      ['nature', existing.nature, item.nature],
      [
        'prerequisites',
        describeRequirement(existing.prerequisites),
        describeRequirement(item.prerequisites),
      ],
      [
        'corequisites',
        describeRequirement(existing.corequisites),
        describeRequirement(item.corequisites),
      ],
      [
        'branches',
        linksText(existing.branches),
        linksText(targetLinks(match, item, existing)),
      ],
    ]
    const fields = pairs
      .filter(([, before, after]) => !sameValue(before, after))
      .map(([field, before, after]) => ({ field, before, after }))
    if (fields.length > 0) subjects.changed.push({ key: item.code, fields })
  }

  return { header, subjects, branches }
}

export const isEmptyDiff = (diff: CurriculumDiff) =>
  diff.header.length === 0 &&
  Object.values(diff.subjects).every((list) => list.length === 0) &&
  Object.values(diff.branches).every((list) => list.length === 0)

// Aplica o arquivo sobre a EC que já existe pelas mesmas operações da edição
// manual, então as travas depois da 1ª matrícula valem igual
export function applyIncoming(
  current: Curriculum,
  incoming: Curriculum,
  ctx: EditContext,
): Curriculum {
  const match = matchBranches(current, incoming)
  let next = updateHeader(
    current,
    { ...incoming.header, slug: current.header.slug },
    ctx,
  )

  for (const branch of byDepth(incoming.branches)) {
    const { id: _, position: __, ...fields } = branch
    const parentId = branch.parentId ? remap(match, branch.parentId) : null
    const target = match.toCurrent.get(branch.id)
    next = target
      ? updateBranch(next, target, { ...fields, parentId }, ctx)
      : createBranch(next, { ...branch, parentId })
  }

  const currentSubjects = new Map(
    current.subjects.map((item) => [item.code, item]),
  )
  const incomingCodes = new Set(incoming.subjects.map((item) => item.code))
  for (const item of incoming.subjects) {
    const existing = currentSubjects.get(item.code)
    const branches = targetLinks(match, item, existing)
    next = existing
      ? updateSubject(
          next,
          item.code,
          {
            semester: item.semester,
            nature: item.nature,
            prerequisites: item.prerequisites,
            corequisites: item.corequisites,
            branches,
          },
          ctx,
        )
      : addSubject(next, { ...item, branches })
  }
  for (const item of current.subjects) {
    if (!incomingCodes.has(item.code)) {
      next = removeSubject(next, item.code, ctx)
    }
  }

  for (const branch of byDepth(match.removed).reverse()) {
    next = removeBranch(next, branch.id, ctx)
  }
  return next
}
