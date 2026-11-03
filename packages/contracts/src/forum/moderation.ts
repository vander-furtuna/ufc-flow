import { z } from 'zod'

import { isoDateTimeSchema, slugSchema, uuidSchema } from '../common/primitives'
import { courseSummarySchema } from '../identity/auth'
import { messageStatusSchema, reportReasonSchema } from './forum'

export const reportStatusSchema = z
  .enum(['OPEN', 'ACCEPTED', 'DISMISSED'])
  .meta({ id: 'ReportStatus' })

export const restrictionTypeSchema = z
  .enum(['MUTE', 'BAN'])
  .meta({ id: 'RestrictionType' })

// Denúncias abertas de pessoas diferentes que ocultam a mensagem sozinhas
export const AUTO_HIDE_REPORTS = 3

const reason = z
  .string()
  .trim()
  .min(3, 'Conte o motivo em poucas palavras')
  .max(300)

export const reportInputSchema = z
  .object({
    reason: reportReasonSchema,
    details: z
      .string()
      .trim()
      .max(500)
      .transform((value) => (value === '' ? null : value))
      .nullable()
      .default(null),
  })
  .meta({ id: 'ReportInput' })

// Ação na mensagem. Remover exige a categoria pública.
export const messageModerationInputSchema = z
  .discriminatedUnion('action', [
    z.object({ action: z.literal('HIDE'), reason }),
    z.object({
      action: z.literal('REMOVE'),
      reason,
      category: reportReasonSchema,
    }),
    z.object({ action: z.literal('RESTORE'), reason }),
  ])
  .meta({ id: 'MessageModerationInput' })

export const dismissReportsInputSchema = z
  .object({ reason })
  .meta({ id: 'DismissReportsInput' })

export const restrictionInputSchema = z
  .object({
    userId: uuidSchema,
    courseSlug: slugSchema,
    type: restrictionTypeSchema,
    reason,
    // Sem prazo: até alguém suspender
    days: z.int().min(1).max(365).nullable(),
  })
  .meta({ id: 'RestrictionInput' })

export const liftRestrictionInputSchema = z
  .object({ reason })
  .meta({ id: 'LiftRestrictionInput' })

const person = z.object({ id: uuidSchema, name: z.string() })

// Um item da fila: a mensagem com as denúncias abertas agrupadas por motivo
export const reportQueueItemSchema = z
  .object({
    messageId: uuidSchema,
    // Para abrir a conversa (a própria mensagem, se for raiz)
    rootId: uuidSchema,
    course: courseSummarySchema,
    author: person.nullable(),
    // Texto do momento da primeira denúncia: editar não apaga a prova
    snapshot: z.string(),
    status: messageStatusSchema,
    autoHidden: z.boolean(),
    reasons: z.array(
      z.object({ reason: reportReasonSchema, count: z.int().positive() }),
    ),
    details: z.array(z.string()),
    reportCount: z.int().positive(),
    firstReportedAt: isoDateTimeSchema,
  })
  .meta({ id: 'ReportQueueItem' })

export const restrictionSchema = z
  .object({
    id: uuidSchema,
    user: person,
    course: courseSummarySchema,
    type: restrictionTypeSchema,
    reason: z.string(),
    createdBy: person.nullable(),
    createdAt: isoDateTimeSchema,
    expiresAt: isoDateTimeSchema.nullable(),
  })
  .meta({ id: 'Restriction' })

// Contadores das abas da tela de moderação
export const moderationSummarySchema = z
  .object({
    openReports: z.int().nonnegative(),
    activeRestrictions: z.int().nonnegative(),
    // Só admin vê os pedidos de moderação
    pendingRequests: z.int().nonnegative().nullable(),
  })
  .meta({ id: 'ModerationSummary' })

// Restrição de quem lê o fórum do curso, para o web avisar
export const myRestrictionSchema = z
  .object({
    type: restrictionTypeSchema,
    expiresAt: isoDateTimeSchema.nullable(),
  })
  .nullable()
  .meta({ id: 'MyRestriction' })

export type ReportStatus = z.infer<typeof reportStatusSchema>
export type RestrictionType = z.infer<typeof restrictionTypeSchema>
export type ReportInput = z.input<typeof reportInputSchema>
export type ParsedReportInput = z.output<typeof reportInputSchema>
export type MessageModerationInput = z.infer<
  typeof messageModerationInputSchema
>
export type DismissReportsInput = z.infer<typeof dismissReportsInputSchema>
export type RestrictionInput = z.infer<typeof restrictionInputSchema>
export type LiftRestrictionInput = z.infer<typeof liftRestrictionInputSchema>
export type ReportQueueItem = z.infer<typeof reportQueueItemSchema>
export type RestrictionView = z.infer<typeof restrictionSchema>
export type ModerationSummary = z.infer<typeof moderationSummarySchema>
export type MyRestriction = z.infer<typeof myRestrictionSchema>
