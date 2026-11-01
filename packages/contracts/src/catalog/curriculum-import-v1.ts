import { z } from 'zod'

import {
  hexColorSchema,
  hoursSchema,
  isoDateTimeSchema,
  subjectCodeSchema,
  termSchema,
} from '../common/primitives'
import {
  branchTypeSchema,
  curriculumNatureSchema,
  subjectTypeSchema,
} from '../enums'
import { requirementExprSchema } from './requirement-expr'

// Códigos dos problemas de coerência do arquivo, em params.code de cada issue
export type CurriculumImportIssueCode =
  | 'CURRICULUM_IMPORT_DUPLICATE_SUBJECT'
  | 'CURRICULUM_IMPORT_DUPLICATE_BRANCH'
  | 'CURRICULUM_IMPORT_UNKNOWN_BRANCH'
  | 'CURRICULUM_IMPORT_BRANCH_CYCLE'

const nameSchema = z.string().trim().min(1)

// Chave local do arquivo (ex.: emphasis-sistemas); vira UUID ao aplicar
const branchKeySchema = z.string().trim().min(1)

const branchSchema = z.strictObject({
  key: branchKeySchema,
  parentKey: branchKeySchema.nullable(),
  type: branchTypeSchema,
  name: nameSchema,
  description: z.string().nullable(),
  color: hexColorSchema.nullable(),
  minHours: hoursSchema.nullable(),
  minComponents: z.int().positive().nullable(),
})

const subjectSchema = z.strictObject({
  code: subjectCodeSchema,
  name: nameSchema,
  type: subjectTypeSchema,
  // Semestre ideal; optativas costumam vir sem
  semester: z.int().positive().nullable(),
  workloadHours: hoursSchema,
  theoryHours: hoursSchema,
  labHours: hoursSchema,
  eadHours: hoursSchema,
  extensionHours: hoursSchema,
  credits: z.int().nonnegative(),
  nature: curriculumNatureSchema,
  prerequisites: requirementExprSchema.nullable(),
  corequisites: requirementExprSchema.nullable(),
  equivalences: requirementExprSchema.nullable(),
  branches: z.array(
    z.strictObject({ key: branchKeySchema, nature: curriculumNatureSchema }),
  ),
})

const curriculumSchema = z.strictObject({
  period: termSchema,
  city: nameSchema,
  minTotalHours: hoursSchema,
  maxTotalHours: hoursSchema.nullable(),
  mandatoryHours: hoursSchema,
  optativeHours: hoursSchema,
  extensionHours: hoursSchema,
  complementaryActivityHours: hoursSchema,
  maxFreeOptativeHours: hoursSchema,
  minPeriods: z.int().positive(),
  avgPeriods: z.int().positive(),
  maxPeriods: z.int().positive(),
  periodMinHours: hoursSchema,
  periodAvgHours: hoursSchema,
  periodMaxHours: hoursSchema,
})

type Draft = {
  branches: z.infer<typeof branchSchema>[]
  subjects: z.infer<typeof subjectSchema>[]
}

type Issue = {
  path: (string | number)[]
  code: CurriculumImportIssueCode
  message: string
}

function findDuplicates<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  onDuplicate: (index: number, key: string) => void,
) {
  const seen = new Set<string>()
  items.forEach((item, index) => {
    const key = keyOf(item)
    if (seen.has(key)) onDuplicate(index, key)
    seen.add(key)
  })
}

// Problemas que o schema de cada campo não enxerga sozinho: repetição,
// referências entre vertentes e ciclos na hierarquia. Ciclos de
// pré-requisito ficam para a publicação.
function checkCoherence({ branches, subjects }: Draft): Issue[] {
  const issues: Issue[] = []
  const keys = new Set(branches.map((branch) => branch.key))

  findDuplicates(
    subjects,
    (item) => item.code,
    (index, code) =>
      issues.push({
        path: ['subjects', index, 'code'],
        code: 'CURRICULUM_IMPORT_DUPLICATE_SUBJECT',
        message: `Disciplina ${code} repetida`,
      }),
  )

  findDuplicates(
    branches,
    (item) => item.key,
    (index, key) =>
      issues.push({
        path: ['branches', index, 'key'],
        code: 'CURRICULUM_IMPORT_DUPLICATE_BRANCH',
        message: `Vertente ${key} repetida`,
      }),
  )

  const parentOf = new Map(
    branches.map((branch) => [branch.key, branch.parentKey]),
  )
  branches.forEach((branch, index) => {
    const path = ['branches', index, 'parentKey']
    if (branch.parentKey === null) return
    if (!keys.has(branch.parentKey)) {
      issues.push({
        path,
        code: 'CURRICULUM_IMPORT_UNKNOWN_BRANCH',
        message: `Vertente-mãe ${branch.parentKey} não existe no arquivo`,
      })
      return
    }

    // Sobe pelos pais; voltar à própria vertente é ciclo
    const visited = new Set<string>()
    let current: string | null | undefined = branch.parentKey
    while (current && !visited.has(current)) {
      if (current === branch.key) {
        issues.push({
          path,
          code: 'CURRICULUM_IMPORT_BRANCH_CYCLE',
          message: `A vertente ${branch.key} é ancestral de si mesma`,
        })
        return
      }
      visited.add(current)
      current = parentOf.get(current)
    }
  })

  subjects.forEach((item, subjectIndex) => {
    findDuplicates(
      item.branches,
      (link) => link.key,
      (index, key) =>
        issues.push({
          path: ['subjects', subjectIndex, 'branches', index, 'key'],
          code: 'CURRICULUM_IMPORT_DUPLICATE_BRANCH',
          message: `Vertente ${key} repetida na disciplina ${item.code}`,
        }),
    )
    item.branches.forEach((link, index) => {
      if (keys.has(link.key)) return
      issues.push({
        path: ['subjects', subjectIndex, 'branches', index, 'key'],
        code: 'CURRICULUM_IMPORT_UNKNOWN_BRANCH',
        message: `Vertente ${link.key} não existe no arquivo`,
      })
    })
  })

  return issues
}

// Formato único de importação de EC, gerado pela extensão ou enviado por
// upload na área administrativa. Mudança incompatível vira schemaVersion 2.
export const curriculumImportV1Schema = z
  .strictObject({
    schemaVersion: z.literal(1),
    source: z.strictObject({
      extractedAt: isoDateTimeSchema,
      url: z.url().nullable(),
    }),
    course: z.strictObject({
      sigaaId: z.string().regex(/^\d+$/, 'Id do curso no SIGAA inválido'),
      name: nameSchema,
    }),
    curriculum: curriculumSchema,
    branches: z.array(branchSchema),
    subjects: z.array(subjectSchema),
  })
  .superRefine((value, ctx) => {
    for (const { path, code, message } of checkCoherence(value)) {
      ctx.addIssue({ code: 'custom', path, message, params: { code } })
    }
  })
  .meta({ id: 'CurriculumImportV1' })

export type CurriculumImportV1 = z.infer<typeof curriculumImportV1Schema>
