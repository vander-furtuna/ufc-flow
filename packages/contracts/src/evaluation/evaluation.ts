import { z } from 'zod'

import {
  isoDateTimeSchema,
  subjectCodeSchema,
  termSchema,
  uuidSchema,
} from '../common/primitives'

// Médias e distribuição só aparecem a partir deste número de respostas
// (modelagem, Avaliação de disciplinas; L5)
export const EVALUATION_MIN_RESPONSES = 5

export const evaluationScoreSchema = z.int().min(1).max(5)

const label = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max)

// Critério gerido pelo admin; desativado some da tela, as notas ficam
export const evaluationCriterionInputSchema = z
  .object({
    key: z
      .string()
      .trim()
      .regex(
        /^[a-z][a-z0-9-]{1,39}$/,
        'Use letras minúsculas, números e hífen',
      ),
    label: label(60, 'Dê um nome ao critério'),
    description: z
      .string()
      .trim()
      .max(200)
      .transform((value) => (value === '' ? null : value))
      .nullable()
      .default(null),
    lowLabel: label(30, 'Diga o que significa a nota 1'),
    highLabel: label(30, 'Diga o que significa a nota 5'),
    isActive: z.boolean().default(true),
  })
  .meta({ id: 'EvaluationCriterionInput' })

export const evaluationCriterionSchema = z
  .object({
    id: uuidSchema,
    key: z.string(),
    label: z.string(),
    description: z.string().nullable(),
    lowLabel: z.string(),
    highLabel: z.string(),
    isActive: z.boolean(),
    position: z.int().nonnegative(),
  })
  .meta({ id: 'EvaluationCriterion' })

export const evaluationCriteriaOrderSchema = z
  .object({ ids: z.array(uuidSchema).min(1).max(30) })
  .meta({ id: 'EvaluationCriteriaOrder' })

// Uma nota por critério ativo
export const evaluationInputSchema = z
  .object({
    scores: z
      .array(
        z.object({ criterionId: uuidSchema, score: evaluationScoreSchema }),
      )
      .min(1)
      .max(30)
      .refine(
        (scores) =>
          new Set(scores.map((item) => item.criterionId)).size ===
          scores.length,
        'Um critério aparece mais de uma vez',
      ),
  })
  .meta({ id: 'EvaluationInput' })

// Quem pode avaliar e a avaliação da própria pessoa (nunca a de outra)
export const myEvaluationSchema = z
  .object({
    eligibility: z.object({
      eligible: z.boolean(),
      // O registro do histórico que libera (o aprovado mais recente)
      status: z.enum(['APROVADO', 'REPROVADO']).nullable(),
      term: termSchema.nullable(),
      // Avaliar exige e-mail institucional (configuração)
      requiresInstitutionalEmail: z.boolean(),
    }),
    scores: z.array(
      z.object({ criterionId: uuidSchema, score: evaluationScoreSchema }),
    ),
    updatedAt: isoDateTimeSchema.nullable(),
  })
  .meta({ id: 'MyEvaluation' })

// Resumo público: com menos de 5 respostas, só os critérios, sem números
export const subjectEvaluationSummarySchema = z
  .object({
    subject: z.object({ code: subjectCodeSchema, name: z.string() }),
    enough: z.boolean(),
    // Nulo abaixo do mínimo, para não dizer quantas há
    total: z.int().nonnegative().nullable(),
    criteria: z.array(
      z.object({
        id: uuidSchema,
        key: z.string(),
        label: z.string(),
        description: z.string().nullable(),
        lowLabel: z.string(),
        highLabel: z.string(),
        mean: z.number().min(1).max(5).nullable(),
        count: z.int().nonnegative().nullable(),
        // Quantas notas 1, 2, 3, 4 e 5
        distribution: z.array(z.int().nonnegative()).length(5).nullable(),
      }),
    ),
  })
  .meta({ id: 'SubjectEvaluationSummary' })

export type EvaluationCriterionInput = z.input<
  typeof evaluationCriterionInputSchema
>
export type ParsedEvaluationCriterionInput = z.output<
  typeof evaluationCriterionInputSchema
>
export type EvaluationCriterion = z.infer<typeof evaluationCriterionSchema>
export type EvaluationCriteriaOrder = z.infer<
  typeof evaluationCriteriaOrderSchema
>
export type EvaluationInput = z.infer<typeof evaluationInputSchema>
export type MyEvaluation = z.infer<typeof myEvaluationSchema>
export type SubjectEvaluationSummary = z.infer<
  typeof subjectEvaluationSummarySchema
>
