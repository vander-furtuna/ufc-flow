import {
  collectCodes,
  normalizeSearchText,
  type RequirementExpr,
} from '@ufc-flow/academic-core'
import type { SubjectType, SubjectWorkload } from '@ufc-flow/contracts'

import { CatalogErrors } from './errors'

// Disciplina global, identificada pelo código do SIGAA. O que muda de uma EC
// para outra fica em CurriculumSubject.
export type Subject = {
  id: string
  code: string
  name: string
  type: SubjectType
  durationTerms: 1 | 2
  workloadHours: number
  theoryHours: number
  labHours: number
  eadHours: number
  extensionHours: number
  credits: number
  // Globais e só na direção gravada (D5, D22)
  equivalences: RequirementExpr | null
  createdAt: Date
  updatedAt: Date
}

export type NewSubject = Omit<
  Subject,
  'equivalences' | 'createdAt' | 'updatedAt'
>

const WORKLOAD_FIELDS = [
  'workloadHours',
  'theoryHours',
  'labHours',
  'eadHours',
  'extensionHours',
  'credits',
] as const satisfies (keyof SubjectWorkload)[]

export const subjectWorkload = (subject: SubjectWorkload): SubjectWorkload => ({
  workloadHours: subject.workloadHours,
  theoryHours: subject.theoryHours,
  labHours: subject.labHours,
  eadHours: subject.eadHours,
  extensionHours: subject.extensionHours,
  credits: subject.credits,
})

export const sameWorkload = (a: SubjectWorkload, b: SubjectWorkload) =>
  WORKLOAD_FIELDS.every((field) => a[field] === b[field])

export const subjectSlug = (name: string) =>
  normalizeSearchText(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const newSubject = (data: NewSubject, now: Date): Subject => ({
  ...data,
  equivalences: null,
  createdAt: now,
  updatedAt: now,
})

// Nome é correção de grafia, sempre livre. Código, cargas e créditos afetam
// o progresso em todos os cursos: só mudam enquanto nenhuma EC publicada usa
// a disciplina.
export function updateGlobalSubject(
  subject: Subject,
  patch: Partial<Pick<Subject, 'code' | 'name' | keyof SubjectWorkload>>,
  ctx: { usedInPublished: boolean; now: Date },
): Subject {
  const lockedChange =
    (patch.code !== undefined && patch.code !== subject.code) ||
    WORKLOAD_FIELDS.some(
      (field) => patch[field] !== undefined && patch[field] !== subject[field],
    )
  if (ctx.usedInPublished && lockedChange) {
    throw CatalogErrors.subjectLockedField()
  }
  const defined = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  )
  return { ...subject, ...defined, updatedAt: ctx.now }
}

// Só admin troca equivalências (checado no caso de uso, pela AccessPolicy)
export function setEquivalences(
  subject: Subject,
  equivalences: RequirementExpr | null,
  now: Date,
): Subject {
  if (collectCodes(equivalences).includes(subject.code)) {
    throw CatalogErrors.selfEquivalence(subject.code)
  }
  return { ...subject, equivalences, updatedAt: now }
}
