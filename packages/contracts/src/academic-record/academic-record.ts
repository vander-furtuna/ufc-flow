import { z } from 'zod'

import {
  isoDateTimeSchema,
  slugSchema,
  subjectCodeSchema,
  termSchema,
  uuidSchema,
} from '../common/primitives'
import {
  activityKindSchema,
  enrollmentStatusSchema,
  recordStatusSchema,
} from '../enums'

const isoDate = z.iso.date()
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use até ${max} caracteres`)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional()

// Número de matrícula da UFC: só dígitos; não é único (modelagem)
export const registrationNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{4,10}$/, 'Informe só os números da matrícula (4 a 10 dígitos)')

// ——— Matrículas ———

export const enrollmentInputSchema = z
  .object({
    courseSlug: slugSchema,
    curriculumSlug: slugSchema,
    registrationNumber: registrationNumberSchema,
    entryTerm: termSchema.nullable().optional(),
  })
  .meta({ id: 'EnrollmentInput' })

export const changeCurriculumInputSchema = z
  .object({ curriculumSlug: slugSchema })
  .meta({ id: 'ChangeCurriculumInput' })

export const enrollmentSchema = z
  .object({
    id: uuidSchema,
    course: z.object({ id: uuidSchema, slug: slugSchema, name: z.string() }),
    curriculum: z.object({
      id: uuidSchema,
      slug: slugSchema,
      code: z.string(),
    }),
    registrationNumber: z.string(),
    status: enrollmentStatusSchema,
    isCurrent: z.boolean(),
    entryTerm: termSchema.nullable(),
    createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'Enrollment' })

// ——— Histórico ———

export const subjectRecordInputSchema = z
  .object({
    subjectCode: subjectCodeSchema,
    term: termSchema,
    status: recordStatusSchema,
    grade: z.number().min(0).max(10).nullable().optional(),
    // APROVEITADA: o registro de origem (outra matrícula) ou a descrição
    sourceRecordId: uuidSchema.nullable().optional(),
    originNote: optionalText(200),
  })
  .meta({ id: 'SubjectRecordInput' })

// Fechar a situação de um CURSANDO
export const closeSubjectRecordInputSchema = z
  .object({
    status: z.enum(['APROVADO', 'REPROVADO', 'TRANCADA', 'SUPRIMIDA']),
    grade: z.number().min(0).max(10).nullable().optional(),
  })
  .meta({ id: 'CloseSubjectRecordInput' })

export const subjectRecordSchema = z
  .object({
    id: uuidSchema,
    subjectCode: subjectCodeSchema,
    subjectName: z.string(),
    workloadHours: z.int().nonnegative(),
    // Natureza na EC da matrícula; FREE quando a disciplina não é da EC
    nature: z.enum(['MANDATORY', 'OPTATIVE', 'FREE']),
    term: termSchema,
    status: recordStatusSchema,
    grade: z.number().nullable(),
    sourceRecordId: uuidSchema.nullable(),
    originNote: z.string().nullable(),
    createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'SubjectRecord' })

// ——— Atividades complementares e de extensão ———

export const activityCategoryInputSchema = z
  .object({
    kind: activityKindSchema,
    name: z.string().trim().min(2, 'Dê um nome à categoria').max(80),
    maxHours: z.int().positive().max(2000).nullable(),
    position: z.int().nonnegative().default(0),
  })
  .meta({ id: 'ActivityCategoryInput' })

export const activityCategorySchema = z
  .object({
    id: uuidSchema,
    kind: activityKindSchema,
    name: z.string(),
    maxHours: z.int().positive().nullable(),
    position: z.int().nonnegative(),
  })
  .meta({ id: 'ActivityCategory' })

export const activityRecordInputSchema = z
  .object({
    kind: activityKindSchema,
    categoryId: uuidSchema.nullable().optional(),
    title: z.string().trim().min(2, 'Dê um título à atividade').max(120),
    description: optionalText(500),
    institution: optionalText(120),
    hours: z.int().positive('Informe as horas').max(2000),
    startedOn: isoDate,
    endedOn: isoDate.nullable().optional(),
    // Arquivo CERTIFICATE enviado antes (POST /files)
    certificateFileId: uuidSchema.nullable().optional(),
  })
  .refine((input) => !input.endedOn || input.endedOn >= input.startedOn, {
    message: 'O fim precisa ser depois do início',
    path: ['endedOn'],
  })
  .meta({ id: 'ActivityRecordInput' })

export const activityRecordSchema = z
  .object({
    id: uuidSchema,
    kind: activityKindSchema,
    categoryId: uuidSchema.nullable(),
    title: z.string(),
    description: z.string().nullable(),
    institution: z.string().nullable(),
    hours: z.int().positive(),
    startedOn: isoDate,
    endedOn: isoDate.nullable(),
    certificateFileId: uuidSchema.nullable(),
    createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'ActivityRecord' })

// ——— Progresso (calculado sob demanda pelo academic-core) ———

const hoursProgress = {
  requiredHours: z.number(),
  completedHours: z.number(),
  met: z.boolean(),
}

export const progressSchema = z
  .object({
    mandatory: z.object(hoursProgress),
    optative: z.object({
      ...hoursProgress,
      curriculumHours: z.number(),
      freeHours: z.number(),
      freeHoursOverCap: z.number(),
    }),
    branches: z.array(
      z.object({
        branchId: uuidSchema,
        name: z.string(),
        type: z.enum(['SLOPE', 'EMPHASIS', 'SPECIFIC_GROUP']),
        color: z.string().nullable(),
        parentId: uuidSchema.nullable(),
        minHours: z.number().nullable(),
        minComponents: z.number().nullable(),
        maxHours: z.number().nullable(),
        maxComponents: z.number().nullable(),
        totalComponents: z.number(),
        completedHours: z.number(),
        completedComponents: z.number(),
        met: z.boolean(),
        overMax: z.boolean(),
      }),
    ),
    emphases: z.object({
      required: z.number().nullable(),
      allowed: z.number().nullable(),
      completed: z.number(),
    }),
    complementary: z.object({
      ...hoursProgress,
      componentCompleted: z.boolean(),
      byCategory: z.array(
        z.object({
          categoryId: uuidSchema.nullable(),
          declaredHours: z.number(),
          countedHours: z.number(),
        }),
      ),
    }),
    extension: z.object({
      ...hoursProgress,
      fromSubjectsHours: z.number(),
      fromActivitiesHours: z.number(),
    }),
    total: z.object(hoursProgress),
  })
  .meta({ id: 'Progress' })

export const availableSubjectSchema = z
  .object({
    code: subjectCodeSchema,
    name: z.string(),
    semester: z.int().positive().nullable(),
    nature: z.enum(['MANDATORY', 'OPTATIVE']),
    workloadHours: z.int().nonnegative(),
    missingCorequisites: z.array(subjectCodeSchema),
  })
  .meta({ id: 'AvailableSubject' })

// Tudo da Minha área numa leitura
export const academicSummarySchema = z
  .object({
    enrollment: enrollmentSchema,
    // Nulo enquanto o admin não marca o semestre vigente
    currentTerm: z
      .object({
        code: termSchema,
        endsAt: isoDate,
      })
      .nullable(),
    // Ritmo médio da EC, para a previsão de conclusão
    avgPeriodHours: z.number().nullable(),
    progress: progressSchema,
    inProgress: z.array(subjectRecordSchema),
    // CURSANDO de semestres que já passaram: o aluno precisa fechar
    staleInProgress: z.array(subjectRecordSchema),
    // Fim do semestre chegando (21 dias) ou CURSANDO antigo
    closeReminderDue: z.boolean(),
    available: z.array(availableSubjectSchema),
    categories: z.array(activityCategorySchema),
  })
  .meta({ id: 'AcademicSummary' })

export type EnrollmentInput = z.infer<typeof enrollmentInputSchema>
export type ChangeCurriculumInput = z.infer<typeof changeCurriculumInputSchema>
export type EnrollmentView = z.infer<typeof enrollmentSchema>
export type SubjectRecordInput = z.infer<typeof subjectRecordInputSchema>
export type CloseSubjectRecordInput = z.infer<
  typeof closeSubjectRecordInputSchema
>
export type SubjectRecordView = z.infer<typeof subjectRecordSchema>
export type ActivityCategoryInput = z.infer<typeof activityCategoryInputSchema>
export type ActivityCategoryView = z.infer<typeof activityCategorySchema>
export type ActivityRecordInput = z.infer<typeof activityRecordInputSchema>
export type ActivityRecordView = z.infer<typeof activityRecordSchema>
export type ProgressView = z.infer<typeof progressSchema>
export type AvailableSubjectView = z.infer<typeof availableSubjectSchema>
export type AcademicSummary = z.infer<typeof academicSummarySchema>
