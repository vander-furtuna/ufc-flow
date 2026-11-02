import { z } from 'zod'

import {
  hexColorSchema,
  hoursSchema,
  isoDateTimeSchema,
  slugSchema,
  subjectCodeSchema,
  termSchema,
  uuidSchema,
} from '../common/primitives'
import {
  branchTypeSchema,
  curriculumNatureSchema,
  curriculumStatusSchema,
  subjectTypeSchema,
} from '../enums'
import { courseSummarySchema } from '../identity/auth'
import { requirementExprSchema } from './requirement-expr'
import { sigaaCourseSchema } from './sigaa-course'

const nameSchema = z.string().trim().min(1).max(200)
const countSchema = z.int().nonnegative()

// Cargas e prazos da EC, iguais aos do CurriculumImportV1 (sem a cidade, que
// vem do campus do curso)
const curriculumRequirementsShape = {
  minTotalHours: hoursSchema,
  maxTotalHours: hoursSchema.nullable(),
  mandatoryHours: hoursSchema,
  optativeHours: hoursSchema,
  extensionHours: hoursSchema,
  specificActivityHours: hoursSchema,
  maxFreeOptativeHours: hoursSchema,
  minPeriods: z.int().positive(),
  avgPeriods: z.int().positive(),
  maxPeriods: z.int().positive(),
  periodMinHours: hoursSchema,
  periodAvgHours: hoursSchema,
  periodMaxHours: hoursSchema,
  minEmphases: countSchema.nullable(),
  maxEmphases: countSchema.nullable(),
}

// Cabeçalho editável da EC: código (dá o slug), vigor e textos do SIGAA
export const curriculumHeaderSchema = z
  .object({
    code: z.string().trim().min(1).max(20),
    effectiveTerm: termSchema,
    slug: slugSchema,
    sigaaId: z.string().regex(/^\d+$/).nullable(),
    matrixName: nameSchema,
    unitName: nameSchema.nullable(),
    ...curriculumRequirementsShape,
  })
  .meta({ id: 'CurriculumHeader' })

export const campusSchema = z
  .object({
    id: uuidSchema,
    slug: slugSchema,
    name: z.string(),
    city: z.string(),
    state: z.string(),
  })
  .meta({ id: 'Campus' })

export const curriculumSummarySchema = z
  .object({
    id: uuidSchema,
    slug: slugSchema,
    code: z.string(),
    effectiveTerm: termSchema,
    status: curriculumStatusSchema,
    isCurrent: z.boolean(),
    // ECs do seed vieram do courses.ts, com os requisitos sem OU: precisam
    // ser reimportadas pela extensão
    needsReimport: z.boolean(),
    publishedAt: isoDateTimeSchema.nullable(),
    updatedAt: isoDateTimeSchema,
  })
  .meta({ id: 'CurriculumSummary' })

export const courseDetailSchema = z
  .object({
    id: uuidSchema,
    sigaaId: z.string(),
    slug: slugSchema,
    name: z.string(),
    icon: z.string(),
    color: hexColorSchema.nullable(),
    isActive: z.boolean(),
    campus: campusSchema,
    // Público: só as publicadas. Gestão: também os rascunhos.
    curricula: z.array(curriculumSummarySchema),
  })
  .meta({ id: 'CourseDetail' })

export const branchSchema = z
  .object({
    id: uuidSchema,
    parentId: uuidSchema.nullable(),
    type: branchTypeSchema,
    name: z.string(),
    description: z.string().nullable(),
    sigaaCode: z.string().nullable(),
    color: hexColorSchema.nullable(),
    mandatoryHours: hoursSchema.nullable(),
    minHours: hoursSchema.nullable(),
    maxHours: hoursSchema.nullable(),
    minComponents: countSchema.nullable(),
    maxComponents: countSchema.nullable(),
    position: z.int().nonnegative(),
  })
  .meta({ id: 'Branch' })

const branchLinkSchema = z.object({
  branchId: uuidSchema,
  nature: curriculumNatureSchema,
})

// Cargas e créditos da disciplina global
const subjectWorkloadShape = {
  workloadHours: hoursSchema,
  theoryHours: hoursSchema,
  labHours: hoursSchema,
  eadHours: hoursSchema,
  extensionHours: hoursSchema,
  credits: countSchema,
}

export const subjectWorkloadSchema = z
  .object(subjectWorkloadShape)
  .meta({ id: 'SubjectWorkload' })

// Disciplina na EC: dados globais (nome, cargas, equivalências) mais os da
// EC (semestre, natureza, requisitos, vertentes)
export const curriculumSubjectSchema = z
  .object({
    subjectId: uuidSchema,
    code: subjectCodeSchema,
    name: z.string(),
    type: subjectTypeSchema,
    durationTerms: z.union([z.literal(1), z.literal(2)]),
    ...subjectWorkloadShape,
    semester: z.int().positive().nullable(),
    nature: curriculumNatureSchema,
    prerequisites: requirementExprSchema.nullable(),
    corequisites: requirementExprSchema.nullable(),
    equivalences: requirementExprSchema.nullable(),
    branches: z.array(branchLinkSchema),
  })
  .meta({ id: 'CurriculumSubject' })

export const curriculumDetailSchema = curriculumSummarySchema
  .extend({
    course: courseSummarySchema,
    header: curriculumHeaderSchema,
    branches: z.array(branchSchema),
    subjects: z.array(curriculumSubjectSchema),
  })
  .meta({ id: 'CurriculumDetail' })

// Pontos para revisar que uma importação deixa na EC (tela Admin-EC)
const reviewPointBase = {
  key: z.string(),
  importId: uuidSchema,
  code: subjectCodeSchema,
  resolvedAt: isoDateTimeSchema.nullable(),
}

export const reviewPointSchema = z
  .discriminatedUnion('type', [
    z.object({
      ...reviewPointBase,
      type: z.literal('SUBJECT_NAME_MISMATCH'),
      catalogName: z.string(),
      importedName: z.string(),
      resolution: z.enum(['KEEP_CATALOG', 'USE_IMPORTED']).nullable(),
    }),
    z.object({
      ...reviewPointBase,
      type: z.literal('SUBJECT_WORKLOAD_MISMATCH'),
      catalog: subjectWorkloadSchema,
      imported: subjectWorkloadSchema,
      resolution: z.enum(['KEEP_CATALOG', 'USE_IMPORTED']).nullable(),
    }),
    z.object({
      ...reviewPointBase,
      type: z.literal('UNKNOWN_REQUIREMENT_CODE'),
      requiredCode: subjectCodeSchema,
      resolution: z.enum(['ACKNOWLEDGED']).nullable(),
    }),
    // Equivalências vindas da importação de um moderador: só um admin aplica
    z.object({
      ...reviewPointBase,
      type: z.literal('EQUIVALENCES_SUGGESTED'),
      suggested: requirementExprSchema,
      current: requirementExprSchema.nullable(),
      resolution: z.enum(['APPLY', 'IGNORE']).nullable(),
    }),
  ])
  .meta({ id: 'ReviewPoint' })

export const reviewResolutionSchema = z.enum([
  'KEEP_CATALOG',
  'USE_IMPORTED',
  'ACKNOWLEDGED',
  'APPLY',
  'IGNORE',
])

export const resolveReviewPointInputSchema = z
  .object({ resolution: reviewResolutionSchema })
  .meta({ id: 'ResolveReviewPointInput' })

export const publicationIssueSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    subjectCode: subjectCodeSchema.nullable(),
  })
  .meta({ id: 'PublicationIssue' })

// Checagem antes de publicar: erros barram, avisos só aparecem
export const publicationCheckSchema = z
  .object({
    canPublish: z.boolean(),
    errors: z.array(publicationIssueSchema),
    warnings: z.array(publicationIssueSchema),
  })
  .meta({ id: 'PublicationCheck' })

// EC na área de gestão: inclui rascunho, pontos para revisar e se já há
// matrícula vinculada (o que trava parte da edição)
export const managedCurriculumSchema = curriculumDetailSchema
  .extend({
    locked: z.boolean(),
    reviewPoints: z.array(reviewPointSchema),
    publicationCheck: publicationCheckSchema,
  })
  .meta({ id: 'ManagedCurriculum' })

export const createCurriculumInputSchema = curriculumHeaderSchema
  .omit({ sigaaId: true })
  .extend({ sigaaId: z.string().regex(/^\d+$/).nullable().default(null) })
  .meta({ id: 'CreateCurriculumInput' })

export const updateCurriculumInputSchema = curriculumHeaderSchema
  .partial()
  .meta({ id: 'UpdateCurriculumInput' })

// Edição de uma disciplina na EC (painel lateral do Admin-EC)
export const curriculumSubjectInputSchema = z
  .object({
    semester: z.int().positive().nullable(),
    nature: curriculumNatureSchema,
    prerequisites: requirementExprSchema.nullable(),
    corequisites: requirementExprSchema.nullable(),
    branches: z.array(branchLinkSchema),
  })
  .meta({ id: 'CurriculumSubjectInput' })

// Disciplina nova no catálogo global, quando o código ainda não existe
export const newSubjectInputSchema = z
  .object({
    name: nameSchema,
    type: subjectTypeSchema,
    durationTerms: z.union([z.literal(1), z.literal(2)]),
    ...subjectWorkloadShape,
  })
  .meta({ id: 'NewSubjectInput' })

export const addCurriculumSubjectInputSchema = curriculumSubjectInputSchema
  .extend({
    code: subjectCodeSchema,
    subject: newSubjectInputSchema.nullable().default(null),
  })
  .meta({ id: 'AddCurriculumSubjectInput' })

export const branchInputSchema = z
  .object({
    parentId: uuidSchema.nullable(),
    type: branchTypeSchema,
    name: nameSchema,
    description: z.string().trim().max(1000).nullable(),
    sigaaCode: z.string().trim().min(1).max(20).nullable(),
    color: hexColorSchema.nullable(),
    mandatoryHours: hoursSchema.nullable(),
    minHours: hoursSchema.nullable(),
    maxHours: hoursSchema.nullable(),
    minComponents: countSchema.nullable(),
    maxComponents: countSchema.nullable(),
  })
  .meta({ id: 'BranchInput' })

// Vínculo em lote: a lista completa de disciplinas da vertente
export const branchSubjectsInputSchema = z
  .object({
    subjects: z.array(
      z.object({ code: subjectCodeSchema, nature: curriculumNatureSchema }),
    ),
  })
  .meta({ id: 'BranchSubjectsInput' })

export const subjectSchema = z
  .object({
    id: uuidSchema,
    code: subjectCodeSchema,
    name: z.string(),
    type: subjectTypeSchema,
    durationTerms: z.union([z.literal(1), z.literal(2)]),
    ...subjectWorkloadShape,
    equivalences: requirementExprSchema.nullable(),
  })
  .meta({ id: 'Subject' })

// ?codes=ECO0083,SBL0084 (até 300): a extensão compara os nomes lidos no
// SIGAA com os do catálogo do Flow antes de enviar
export const subjectLookupQuerySchema = z.object({
  codes: z
    .string()
    .transform((value) =>
      [
        ...new Set(value.split(',').map((code) => code.trim().toUpperCase())),
      ].filter(Boolean),
    )
    .pipe(z.array(subjectCodeSchema).min(1).max(300)),
})

export const updateSubjectInputSchema = z
  .object({
    code: subjectCodeSchema,
    name: nameSchema,
    ...subjectWorkloadShape,
  })
  .partial()
  .meta({ id: 'UpdateSubjectInput' })

export const subjectEquivalencesInputSchema = z
  .object({ equivalences: requirementExprSchema.nullable() })
  .meta({ id: 'SubjectEquivalencesInput' })

// Curso do catálogo do SIGAA, com o curso do Flow criado a partir dele
export const sigaaCourseEntrySchema = z
  .object({
    sigaaCourse: sigaaCourseSchema,
    flowCourseId: uuidSchema.nullable(),
    // Sumiu da lista pública do SIGAA na última leitura
    removed: z.boolean(),
  })
  .meta({ id: 'SigaaCourseEntry' })

export const sigaaCourseRefreshSchema = z
  .object({
    total: countSchema,
    added: countSchema,
    removed: countSchema,
    refreshedAt: isoDateTimeSchema,
  })
  .meta({ id: 'SigaaCourseRefresh' })

export const createCourseInputSchema = z
  .object({
    sigaaId: z.string().regex(/^\d+$/),
    slug: slugSchema,
    name: nameSchema,
    icon: z.string().trim().min(1).max(40),
    color: hexColorSchema.nullable().default(null),
  })
  .meta({ id: 'CreateCourseInput' })

export const updateCourseInputSchema = z
  .object({
    slug: slugSchema,
    name: nameSchema,
    icon: z.string().trim().min(1).max(40),
    color: hexColorSchema.nullable(),
    isActive: z.boolean(),
  })
  .partial()
  .meta({ id: 'UpdateCourseInput' })

export type CurriculumHeader = z.infer<typeof curriculumHeaderSchema>
export type Campus = z.infer<typeof campusSchema>
export type CurriculumSummary = z.infer<typeof curriculumSummarySchema>
export type CourseDetail = z.infer<typeof courseDetailSchema>
export type BranchView = z.infer<typeof branchSchema>
export type SubjectWorkload = z.infer<typeof subjectWorkloadSchema>
export type CurriculumSubjectView = z.infer<typeof curriculumSubjectSchema>
export type CurriculumDetail = z.infer<typeof curriculumDetailSchema>
export type ReviewPoint = z.infer<typeof reviewPointSchema>
export type ReviewResolution = z.infer<typeof reviewResolutionSchema>
export type ResolveReviewPointInput = z.infer<
  typeof resolveReviewPointInputSchema
>
export type PublicationIssue = z.infer<typeof publicationIssueSchema>
export type PublicationCheck = z.infer<typeof publicationCheckSchema>
export type ManagedCurriculum = z.infer<typeof managedCurriculumSchema>
export type CreateCurriculumInput = z.infer<typeof createCurriculumInputSchema>
export type UpdateCurriculumInput = z.infer<typeof updateCurriculumInputSchema>
export type CurriculumSubjectInput = z.infer<
  typeof curriculumSubjectInputSchema
>
export type NewSubjectInput = z.infer<typeof newSubjectInputSchema>
export type AddCurriculumSubjectInput = z.infer<
  typeof addCurriculumSubjectInputSchema
>
export type BranchInput = z.infer<typeof branchInputSchema>
export type BranchSubjectsInput = z.infer<typeof branchSubjectsInputSchema>
export type SubjectView = z.infer<typeof subjectSchema>
export type UpdateSubjectInput = z.infer<typeof updateSubjectInputSchema>
export type SubjectLookupQuery = z.infer<typeof subjectLookupQuerySchema>
export type SubjectEquivalencesInput = z.infer<
  typeof subjectEquivalencesInputSchema
>
export type SigaaCourseEntry = z.infer<typeof sigaaCourseEntrySchema>
export type SigaaCourseRefresh = z.infer<typeof sigaaCourseRefreshSchema>
export type CreateCourseInput = z.infer<typeof createCourseInputSchema>
export type UpdateCourseInput = z.infer<typeof updateCourseInputSchema>
