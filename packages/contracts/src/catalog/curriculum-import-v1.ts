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
  courseRecognitionSchema,
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
  | 'CURRICULUM_IMPORT_INVALID_RANGE'

const nameSchema = z.string().trim().min(1)

const sigaaIdSchema = z.string().regex(/^\d+$/, 'Id do SIGAA inválido')

const countSchema = z.int().nonnegative()

// Chave local do arquivo (ex.: emphasis-sistemas); vira UUID ao aplicar
const branchKeySchema = z.string().trim().min(1)

const branchSchema = z.strictObject({
  key: branchKeySchema,
  parentKey: branchKeySchema.nullable(),
  type: branchTypeSchema,
  name: nameSchema,
  description: z.string().nullable(),
  // Código da ênfase no SIGAA (ex.: 2023.1E2); grupos não têm
  sigaaCode: z.string().trim().min(1).nullable(),
  color: hexColorSchema.nullable(),
  // Ênfase: CH obrigatória e CH optativa mínima (minHours). Grupo: CH mínima
  // e máxima e quantidade mínima e máxima de componentes (D37).
  mandatoryHours: hoursSchema.nullable(),
  minHours: hoursSchema.nullable(),
  maxHours: hoursSchema.nullable(),
  minComponents: countSchema.nullable(),
  maxComponents: countSchema.nullable(),
})

const subjectSchema = z.strictObject({
  code: subjectCodeSchema,
  name: nameSchema,
  type: subjectTypeSchema,
  // Semestre como o SIGAA mostra, inclusive nas optativas (D39); nulo só
  // quando a página não traz cabeçalho de semestre
  semester: z.int().positive().nullable(),
  // 1 período letivo, ou 2 nos componentes anuais (D38)
  durationTerms: z.union([z.literal(1), z.literal(2)]),
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
  // Código da EC no SIGAA, que dá o slug. Nem sempre é o período de vigor
  // (Arquitetura: código 2023.1, vigor 2024.1) (D35).
  code: z.string().trim().min(1).max(20),
  effectiveTerm: termSchema,
  // Id da EC no SIGAA, quando a extensão o captura na tela de busca
  sigaaId: sigaaIdSchema.nullable(),
  // Textos do cabeçalho como vieram, para a API conferir o curso (D34)
  matrixName: nameSchema,
  unitName: z.string().trim().min(1).nullable(),
  city: nameSchema,
  minTotalHours: hoursSchema,
  maxTotalHours: hoursSchema.nullable(),
  mandatoryHours: hoursSchema,
  optativeHours: hoursSchema,
  extensionHours: hoursSchema,
  // "Carga Horária Obrigatória de Atividade Acadêmica Específica": a soma
  // dos componentes obrigatórios que não são disciplina (D40)
  specificActivityHours: hoursSchema,
  maxFreeOptativeHours: hoursSchema,
  minPeriods: z.int().positive(),
  avgPeriods: z.int().positive(),
  maxPeriods: z.int().positive(),
  periodMinHours: hoursSchema,
  periodAvgHours: hoursSchema,
  periodMaxHours: hoursSchema,
  // "Ênfases: Exigido (n), Permitido (m)"; nulos em "Sem exigências"
  minEmphases: countSchema.nullable(),
  maxEmphases: countSchema.nullable(),
})

type Draft = {
  curriculum: z.infer<typeof curriculumSchema>
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
function checkCoherence({ curriculum, branches, subjects }: Draft): Issue[] {
  const issues: Issue[] = []
  const keys = new Set(branches.map((branch) => branch.key))

  const checkRange = (
    path: (string | number)[],
    min: number | null,
    max: number | null,
    label: string,
  ) => {
    if (min === null || max === null || min <= max) return
    issues.push({
      path,
      code: 'CURRICULUM_IMPORT_INVALID_RANGE',
      message: `${label}: mínimo ${min} maior que o máximo ${max}`,
    })
  }

  checkRange(
    ['curriculum', 'maxEmphases'],
    curriculum.minEmphases,
    curriculum.maxEmphases,
    'Ênfases',
  )
  branches.forEach((branch, index) => {
    checkRange(
      ['branches', index, 'maxHours'],
      branch.minHours,
      branch.maxHours,
      `Horas da vertente ${branch.key}`,
    )
    checkRange(
      ['branches', index, 'maxComponents'],
      branch.minComponents,
      branch.maxComponents,
      `Componentes da vertente ${branch.key}`,
    )
  })

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
      sigaaId: sigaaIdSchema,
      name: nameSchema,
      recognition: courseRecognitionSchema,
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
