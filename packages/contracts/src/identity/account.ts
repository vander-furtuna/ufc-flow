import { z } from 'zod'

import { isoDateTimeSchema, uuidSchema } from '../common/primitives'
import { cursorPage, cursorPageQuerySchema } from '../common/pagination'
import { userRoleSchema, userStatusSchema } from '../enums'

// Versões vigentes dos documentos (D46). O web mostra o mesmo número nas
// páginas /termos e /privacidade; quem aceitou uma versão anterior precisa
// aceitar de novo.
export const CONSENT_VERSIONS = { terms: '1.0', privacy: '1.0' } as const

export const consentDocumentSchema = z
  .enum(['TERMS', 'PRIVACY'])
  .meta({ id: 'ConsentDocument' })

// Novo aceite: o web manda as versões que mostrou, e a API recusa se não
// forem as vigentes (a pessoa leu um texto antigo)
export const consentAcceptanceInputSchema = z
  .object({
    termsVersion: z.string().min(1).max(20),
    privacyVersion: z.string().min(1).max(20),
  })
  .meta({ id: 'ConsentAcceptanceInput' })

// Exclusão de conta: a senha confirma que é a própria pessoa
export const accountDeletionInputSchema = z
  .object({ password: z.string().min(1, 'Informe a senha').max(128) })
  .meta({ id: 'AccountDeletionInput' })

const rows = z.array(z.record(z.string(), z.unknown()))

// GET /me/export (portabilidade, LGPD). Cada seção traz as linhas como estão
// no banco, sem segredos (hash de senha e de tokens ficam de fora).
export const personalDataExportSchema = z
  .object({
    format: z.literal('ufc-flow-export/v1'),
    exportedAt: isoDateTimeSchema,
    account: z.object({
      id: uuidSchema,
      name: z.string(),
      email: z.string(),
      status: userStatusSchema,
      roles: z.array(userRoleSchema),
      avatarFileId: uuidSchema.nullable(),
      createdAt: isoDateTimeSchema,
      updatedAt: isoDateTimeSchema,
    }),
    consents: rows,
    sessions: rows,
    preferences: rows,
    moderatorRequests: rows,
    moderatedCourses: rows,
    enrollments: rows,
    subjectRecords: rows,
    activityRecords: rows,
    schedules: rows,
    files: rows,
    hubPosts: rows,
    forumMessages: rows,
    forumLikes: rows,
    forumReports: rows,
    evaluations: rows,
    notifications: rows,
  })
  .meta({ id: 'PersonalDataExport' })

// Admin › Usuários
export const adminUserSchema = z
  .object({
    id: uuidSchema,
    name: z.string(),
    email: z.string(),
    status: userStatusSchema,
    roles: z.array(userRoleSchema),
    // Avaliações de disciplina ainda ligadas à conta
    evaluationCount: z.int().nonnegative(),
    createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'AdminUser' })

export const adminUserPageSchema = cursorPage(adminUserSchema).meta({
  id: 'AdminUserPage',
})

// ?q=&status=&cursor=&limit= (busca por nome ou e-mail)
export const adminUserListQuerySchema = cursorPageQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
  status: userStatusSchema.optional(),
})

export const discardedEvaluationsSchema = z
  .object({ discarded: z.int().nonnegative() })
  .meta({ id: 'DiscardedEvaluations' })

export type ConsentDocument = z.infer<typeof consentDocumentSchema>
export type ConsentAcceptanceInput = z.infer<
  typeof consentAcceptanceInputSchema
>
export type AccountDeletionInput = z.infer<typeof accountDeletionInputSchema>
export type PersonalDataExport = z.infer<typeof personalDataExportSchema>
export type AdminUser = z.infer<typeof adminUserSchema>
export type AdminUserPage = z.infer<typeof adminUserPageSchema>
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>
export type DiscardedEvaluations = z.infer<typeof discardedEvaluationsSchema>
