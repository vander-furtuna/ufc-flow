import { z } from 'zod'

import { cursorPage, cursorPageQuerySchema } from '../common/pagination'
import { reportReasonSchema } from '../forum/forum'
import {
  isoDateTimeSchema,
  slugSchema,
  subjectCodeSchema,
  termSchema,
  uuidSchema,
} from '../common/primitives'

// Tipos da fase 7 e os do fórum e da moderação dele (fase 11)
export const notificationTypeSchema = z
  .enum([
    'MODERATOR_REQUEST_CREATED',
    'MODERATOR_REQUEST_REVIEWED',
    'SCHEDULE_SECTION_CHANGED',
    'SCHEDULE_SECTION_REMOVED',
    'SCRAPE_FAILED',
    'IMPORT_PENDING',
    'FORUM_REPLY',
    'FORUM_THREAD_REPLY',
    'FORUM_LIKES',
    'MESSAGE_MODERATED',
    'USER_RESTRICTED',
  ])
  .meta({ id: 'NotificationType' })

// Os dados são uma cópia do momento do evento: a notificação não depende de
// o curso, a turma ou a solicitação continuarem iguais
const sectionData = z.object({
  sectionId: uuidSchema,
  subjectCode: subjectCodeSchema,
  subjectName: z.string(),
  sectionCode: z.string(),
  term: termSchema,
  courseSlug: slugSchema,
  curriculumSlug: slugSchema,
  // Agendas da pessoa que têm a turma
  scheduleNames: z.array(z.string()),
})

// Resposta no fórum: o trecho é do momento, para a notificação não depender
// de a mensagem continuar igual
const forumReplyData = z.object({
  messageId: uuidSchema,
  rootId: uuidSchema,
  courseSlug: slugSchema,
  courseName: z.string(),
  authorName: z.string(),
  excerpt: z.string(),
})

const base = {
  id: uuidSchema,
  readAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  // Muda quando notificações agrupadas são somadas
  updatedAt: isoDateTimeSchema,
}

export const notificationSchema = z
  .discriminatedUnion('type', [
    z.object({
      ...base,
      type: z.literal('MODERATOR_REQUEST_CREATED'),
      data: z.object({
        requestId: uuidSchema,
        requesterName: z.string(),
        courseName: z.string(),
      }),
    }),
    z.object({
      ...base,
      type: z.literal('MODERATOR_REQUEST_REVIEWED'),
      data: z.object({
        requestId: uuidSchema,
        courseName: z.string(),
        courseSlug: slugSchema,
        decision: z.enum(['APPROVED', 'REJECTED']),
        note: z.string().nullable(),
      }),
    }),
    z.object({
      ...base,
      type: z.literal('SCHEDULE_SECTION_CHANGED'),
      data: sectionData,
    }),
    z.object({
      ...base,
      type: z.literal('SCHEDULE_SECTION_REMOVED'),
      data: sectionData,
    }),
    z.object({
      ...base,
      type: z.literal('SCRAPE_FAILED'),
      data: z.object({
        courseName: z.string(),
        courseSlug: slugSchema,
        term: termSchema,
        error: z.string(),
        // Falhas seguidas enquanto a notificação não foi lida
        failures: z.int().positive(),
      }),
    }),
    z.object({
      ...base,
      type: z.literal('FORUM_REPLY'),
      data: forumReplyData,
    }),
    z.object({
      ...base,
      type: z.literal('FORUM_THREAD_REPLY'),
      data: forumReplyData,
    }),
    z.object({
      ...base,
      type: z.literal('FORUM_LIKES'),
      data: z.object({
        messageId: uuidSchema,
        courseSlug: slugSchema,
        excerpt: z.string(),
        // As últimas pessoas que curtiram ("Ana e mais 4")
        likerNames: z.array(z.string()).max(3),
        // Curtidas somadas enquanto a notificação não foi lida
        likes: z.int().positive(),
      }),
    }),
    z.object({
      ...base,
      type: z.literal('MESSAGE_MODERATED'),
      data: z.object({
        messageId: uuidSchema,
        courseSlug: slugSchema,
        courseName: z.string(),
        action: z.enum(['HIDE', 'REMOVE', 'RESTORE']),
        category: reportReasonSchema.nullable(),
        excerpt: z.string(),
      }),
    }),
    z.object({
      ...base,
      type: z.literal('USER_RESTRICTED'),
      data: z.object({
        courseSlug: slugSchema,
        courseName: z.string(),
        restriction: z.enum(['MUTE', 'BAN']),
        // A restrição acabou (suspensa pela moderação)
        lifted: z.boolean(),
        expiresAt: isoDateTimeSchema.nullable(),
      }),
    }),
    z.object({
      ...base,
      type: z.literal('IMPORT_PENDING'),
      data: z.object({
        importId: uuidSchema,
        sigaaId: z.string().regex(/^\d+$/),
        courseName: z.string(),
        // Importações esperando o mesmo curso enquanto não lida
        imports: z.int().positive(),
      }),
    }),
  ])
  .meta({ id: 'Notification' })

export const notificationPageSchema = cursorPage(notificationSchema).meta({
  id: 'NotificationPage',
})

export const notificationListQuerySchema = cursorPageQuerySchema
  .extend({ unread: z.stringbool().optional() })
  .meta({ id: 'NotificationListQuery' })

export const unreadCountSchema = z
  .object({ count: z.int().nonnegative() })
  .meta({ id: 'UnreadCount' })

// Marca como lidas: algumas (ids) ou todas
export const markNotificationsReadInputSchema = z
  .union([
    z.object({ ids: z.array(uuidSchema).min(1).max(100) }),
    z.object({ all: z.literal(true) }),
  ])
  .meta({ id: 'MarkNotificationsReadInput' })

// Tipos silenciados (user_preferences, chave notifications.muted)
export const notificationPreferencesSchema = z
  .object({ muted: z.array(notificationTypeSchema) })
  .meta({ id: 'NotificationPreferences' })

export type NotificationType = z.infer<typeof notificationTypeSchema>
export type NotificationView = z.infer<typeof notificationSchema>
export type NotificationData<T extends NotificationType> = Extract<
  NotificationView,
  { type: T }
>['data']
export type NotificationPage = z.infer<typeof notificationPageSchema>
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>
export type UnreadCount = z.infer<typeof unreadCountSchema>
export type MarkNotificationsReadInput = z.infer<
  typeof markNotificationsReadInputSchema
>
export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>
