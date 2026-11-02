import type { RequirementExpr } from '@ufc-flow/academic-core'
import type {
  BranchType,
  CurriculumHeader,
  CurriculumStatus,
  PublicationCheck,
} from '@ufc-flow/contracts'

import { CatalogErrors } from './errors'

export type Nature = 'MANDATORY' | 'OPTATIVE'

export type BranchLink = { branchId: string; nature: Nature }

// Disciplina dentro da EC. Nome, cargas e equivalências são da disciplina
// global (Subject); aqui fica o que muda de uma EC para outra.
export type CurriculumSubject = {
  id: string
  subjectId: string
  code: string
  semester: number | null
  nature: Nature
  prerequisites: RequirementExpr | null
  corequisites: RequirementExpr | null
  branches: BranchLink[]
}

export type Branch = {
  id: string
  parentId: string | null
  type: BranchType
  name: string
  description: string | null
  sigaaCode: string | null
  color: string | null
  mandatoryHours: number | null
  minHours: number | null
  maxHours: number | null
  minComponents: number | null
  maxComponents: number | null
  position: number
}

export type BranchFields = Omit<Branch, 'id' | 'position'>

export type Curriculum = {
  id: string
  courseId: string
  header: CurriculumHeader
  status: CurriculumStatus
  isCurrent: boolean
  needsReimport: boolean
  publishedAt: Date | null
  publishedBy: string | null
  createdAt: Date
  updatedAt: Date
  branches: Branch[]
  subjects: CurriculumSubject[]
}

export type CurriculumSubjectChanges = Pick<
  CurriculumSubject,
  'semester' | 'nature' | 'prerequisites' | 'corequisites' | 'branches'
>

// Depois da primeira matrícula vinculada, parte da EC trava (tabela "Ciclo
// de vida e edição" da modelagem). Antes disso tudo é editável.
export type EditContext = { locked: boolean }

// Campos do cabeçalho que mudam o cálculo de integralização ou as URLs
const LOCKED_HEADER_FIELDS = new Set<keyof CurriculumHeader>([
  'code',
  'effectiveTerm',
  'slug',
  'minTotalHours',
  'maxTotalHours',
  'mandatoryHours',
  'optativeHours',
  'extensionHours',
  'specificActivityHours',
  'maxFreeOptativeHours',
  'minPeriods',
  'avgPeriods',
  'maxPeriods',
  'periodMinHours',
  'periodAvgHours',
  'periodMaxHours',
  'minEmphases',
  'maxEmphases',
])

// Campos com rótulo próprio na mensagem; os demais são "as cargas horárias"
const LABELED_HEADER_FIELDS = new Set<string>(['code', 'effectiveTerm', 'slug'])

// Tipo, mãe e limites mudam o cálculo por vertente
const BRANCH_RULE_FIELDS = [
  'type',
  'parentId',
  'mandatoryHours',
  'minHours',
  'maxHours',
  'minComponents',
  'maxComponents',
] as const satisfies (keyof BranchFields)[]

const sameValue = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b)

function checkRange(min: number | null, max: number | null, label: string) {
  if (min !== null && max !== null && min > max) {
    throw CatalogErrors.invalidRange(label)
  }
}

function findSubject(c: Curriculum, code: string) {
  const subject = c.subjects.find((item) => item.code === code)
  if (!subject) throw CatalogErrors.subjectNotInCurriculum(code)
  return subject
}

function findBranch(c: Curriculum, id: string) {
  const branch = c.branches.find((item) => item.id === id)
  if (!branch) throw CatalogErrors.branchNotFound()
  return branch
}

function checkLinks(c: Curriculum, links: readonly BranchLink[]) {
  const seen = new Set<string>()
  for (const link of links) {
    findBranch(c, link.branchId)
    if (seen.has(link.branchId)) throw CatalogErrors.duplicateBranchLink()
    seen.add(link.branchId)
  }
}

// Vínculos removidos ou com outra natureza contam como mudança travada
function linksLoseSomething(
  before: readonly BranchLink[],
  after: readonly BranchLink[],
) {
  return before.some((link) => {
    const next = after.find((item) => item.branchId === link.branchId)
    return !next || next.nature !== link.nature
  })
}

function checkBranchFields(c: Curriculum, id: string, fields: BranchFields) {
  checkRange(
    fields.minHours,
    fields.maxHours,
    `Horas da vertente ${fields.name}`,
  )
  checkRange(
    fields.minComponents,
    fields.maxComponents,
    `Componentes da vertente ${fields.name}`,
  )
  // Sobe pelas mães: chegar na própria vertente é ciclo
  let parentId = fields.parentId
  const visited = new Set<string>()
  while (parentId !== null && !visited.has(parentId)) {
    if (parentId === id) throw CatalogErrors.branchCycle()
    visited.add(parentId)
    parentId = findBranch(c, parentId).parentId
  }
}

const withSubject = (
  c: Curriculum,
  code: string,
  change: (subject: CurriculumSubject) => CurriculumSubject,
): Curriculum => ({
  ...c,
  subjects: c.subjects.map((item) =>
    item.code === code ? change(item) : item,
  ),
})

export function updateHeader(
  c: Curriculum,
  patch: Partial<CurriculumHeader>,
  ctx: EditContext,
): Curriculum {
  const header = { ...c.header }
  for (const [field, value] of Object.entries(patch) as [
    keyof CurriculumHeader,
    unknown,
  ][]) {
    if (value === undefined || sameValue(header[field], value)) continue
    if (ctx.locked && LOCKED_HEADER_FIELDS.has(field)) {
      throw CatalogErrors.lockedField(
        LABELED_HEADER_FIELDS.has(field) ? field : 'hours',
      )
    }
    Object.assign(header, { [field]: value })
  }
  checkRange(header.minEmphases, header.maxEmphases, 'Ênfases')
  return { ...c, header }
}

export function addSubject(
  c: Curriculum,
  subject: CurriculumSubject,
): Curriculum {
  if (c.subjects.some((item) => item.code === subject.code)) {
    throw CatalogErrors.subjectAlreadyInCurriculum(subject.code)
  }
  checkLinks(c, subject.branches)
  return { ...c, subjects: [...c.subjects, subject] }
}

export function updateSubject(
  c: Curriculum,
  code: string,
  changes: CurriculumSubjectChanges,
  ctx: EditContext,
): Curriculum {
  const current = findSubject(c, code)
  checkLinks(c, changes.branches)
  if (ctx.locked && changes.nature !== current.nature) {
    throw CatalogErrors.lockedField('nature')
  }
  if (ctx.locked && linksLoseSomething(current.branches, changes.branches)) {
    throw CatalogErrors.lockedField('branches')
  }
  return withSubject(c, code, (subject) => ({ ...subject, ...changes }))
}

export function removeSubject(
  c: Curriculum,
  code: string,
  ctx: EditContext,
): Curriculum {
  findSubject(c, code)
  if (ctx.locked) throw CatalogErrors.lockedField('subject')
  return { ...c, subjects: c.subjects.filter((item) => item.code !== code) }
}

export function createBranch(c: Curriculum, branch: Branch): Curriculum {
  checkBranchFields(c, branch.id, branch)
  const position = Math.max(-1, ...c.branches.map((item) => item.position)) + 1
  return { ...c, branches: [...c.branches, { ...branch, position }] }
}

export function updateBranch(
  c: Curriculum,
  id: string,
  fields: BranchFields,
  ctx: EditContext,
): Curriculum {
  const current = findBranch(c, id)
  checkBranchFields(c, id, fields)
  if (
    ctx.locked &&
    BRANCH_RULE_FIELDS.some((field) => current[field] !== fields[field])
  ) {
    throw CatalogErrors.lockedField('branchRules')
  }
  return {
    ...c,
    branches: c.branches.map((item) =>
      item.id === id
        ? { ...item, ...fields, id, position: item.position }
        : item,
    ),
  }
}

export function removeBranch(
  c: Curriculum,
  id: string,
  ctx: EditContext,
): Curriculum {
  findBranch(c, id)
  if (ctx.locked) throw CatalogErrors.lockedField('branch')
  if (c.branches.some((item) => item.parentId === id)) {
    throw CatalogErrors.branchHasChildren()
  }
  return {
    ...c,
    branches: c.branches.filter((item) => item.id !== id),
    subjects: c.subjects.map((subject) => ({
      ...subject,
      branches: subject.branches.filter((link) => link.branchId !== id),
    })),
  }
}

// Vínculo em lote: a lista passa a ser exatamente as disciplinas da vertente
export function setBranchSubjects(
  c: Curriculum,
  branchId: string,
  wanted: readonly { code: string; nature: Nature }[],
  ctx: EditContext,
): Curriculum {
  findBranch(c, branchId)
  for (const item of wanted) findSubject(c, item.code)

  return {
    ...c,
    subjects: c.subjects.map((subject) => {
      const desired = wanted.find((item) => item.code === subject.code)
      const others = subject.branches.filter(
        (link) => link.branchId !== branchId,
      )
      const next = desired
        ? [...others, { branchId, nature: desired.nature }]
        : others
      if (ctx.locked && linksLoseSomething(subject.branches, next)) {
        throw CatalogErrors.lockedField('branches')
      }
      return { ...subject, branches: next }
    }),
  }
}

export function publish(
  c: Curriculum,
  check: PublicationCheck,
  by: { userId: string; now: Date },
): Curriculum {
  if (c.status === 'PUBLISHED') throw CatalogErrors.alreadyPublished()
  if (!check.canPublish) throw CatalogErrors.publicationBlocked()
  return {
    ...c,
    status: 'PUBLISHED',
    publishedAt: by.now,
    publishedBy: by.userId,
  }
}

// Decisão administrativa, livre mesmo com matrícula. Quem grava desmarca a
// anterior do curso na mesma transação.
export function markCurrent(c: Curriculum): Curriculum {
  if (c.status !== 'PUBLISHED') throw CatalogErrors.notPublished()
  return { ...c, isCurrent: true }
}

// Slug da EC a partir do código do SIGAA: 2006.2 vira 2006-2
export const curriculumSlug = (code: string) =>
  code
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
