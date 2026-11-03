import { z } from 'zod'

import { cursorPage, cursorPageQuerySchema } from '../common/pagination'
import {
  isoDateTimeSchema,
  slugSchema,
  subjectCodeSchema,
  uuidSchema,
} from '../common/primitives'
import { curriculumNatureSchema } from '../enums'

// Limites do fórum (modelagem, Fórum do curso)
export const FORUM_LIMITS = {
  content: 500,
  mentions: 5,
  editMinutes: 15,
} as const

export const messageStatusSchema = z
  .enum(['VISIBLE', 'HIDDEN', 'REMOVED'])
  .meta({ id: 'MessageStatus' })

// Motivo da denúncia; na remoção pela moderação, é a categoria que aparece
// para todos ("Motivo: dados pessoais"), sem o texto do moderador
export const reportReasonSchema = z
  .enum([
    'SPAM',
    'OFFENSIVE',
    'HARASSMENT',
    'PERSONAL_DATA',
    'OFF_TOPIC',
    'OTHER',
  ])
  .meta({ id: 'ReportReason' })

// Mensagem nova, resposta ou edição. As menções vão no texto como @CÓDIGO.
export const messageInputSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, 'Escreva a mensagem')
      .max(FORUM_LIMITS.content, `Use até ${FORUM_LIMITS.content} caracteres`),
  })
  .meta({ id: 'MessageInput' })

export const messageMentionSchema = z
  .object({ code: subjectCodeSchema, name: z.string(), slug: slugSchema })
  .meta({ id: 'MessageMention' })

export const messageSchema = z
  .object({
    id: uuidSchema,
    courseId: uuidSchema,
    // Resposta: a mensagem respondida e a que abriu a conversa
    parentId: uuidSchema.nullable(),
    rootId: uuidSchema.nullable(),
    // Nulo quando a conta foi excluída
    author: z
      .object({
        id: uuidSchema,
        name: z.string(),
        avatarFileId: uuidSchema.nullable(),
      })
      .nullable(),
    // A quem esta mensagem responde ("respondendo a Carla")
    replyingTo: z.object({ id: uuidSchema, authorName: z.string() }).nullable(),
    // Nulo na mensagem apagada, removida ou oculta para quem lê
    content: z.string().nullable(),
    status: messageStatusSchema,
    // Quem tirou a mensagem do ar: o próprio autor ou a moderação
    removedBy: z.enum(['AUTHOR', 'MODERATION']).nullable(),
    // Categoria pública da remoção pela moderação
    removalCategory: reportReasonSchema.nullable(),
    replyCount: z.int().nonnegative(),
    likeCount: z.int().nonnegative(),
    likedByMe: z.boolean(),
    mentions: z.array(messageMentionSchema),
    createdAt: isoDateTimeSchema,
    editedAt: isoDateTimeSchema.nullable(),
    // Até quando o autor pode editar; nulo para os demais ou depois do prazo
    editableUntil: isoDateTimeSchema.nullable(),
  })
  .meta({ id: 'Message' })

export const messagePageSchema = cursorPage(messageSchema).meta({
  id: 'MessagePage',
})

export const forumQuerySchema = cursorPageQuerySchema

// "N novas mensagens": raízes publicadas depois da mais nova carregada
export const newMessagesQuerySchema = z.object({ since: isoDateTimeSchema })

export const newMessagesCountSchema = z
  .object({ count: z.int().nonnegative() })
  .meta({ id: 'NewMessagesCount' })

// Conversa: a cadeia até a raiz, a mensagem e a primeira página de respostas
export const conversationSchema = z
  .object({
    ancestors: z.array(messageSchema),
    message: messageSchema,
    replies: messagePageSchema,
  })
  .meta({ id: 'Conversation' })

export const likeStateSchema = z
  .object({ likeCount: z.int().nonnegative(), likedByMe: z.boolean() })
  .meta({ id: 'LikeState' })

// Popover de @: disciplinas da EC vigente primeiro, depois o catálogo
export const subjectSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(40),
  limit: z.coerce.number().int().min(1).max(20).default(8),
})

export const subjectSearchResultSchema = z
  .object({
    code: subjectCodeSchema,
    name: z.string(),
    slug: slugSchema,
    // Na EC vigente do curso: período e natureza; fora dela, o outro curso
    inCurriculum: z.boolean(),
    semester: z.int().positive().nullable(),
    nature: curriculumNatureSchema.nullable(),
    courseName: z.string().nullable(),
  })
  .meta({ id: 'SubjectSearchResult' })

export const trendingSubjectSchema = z
  .object({
    code: subjectCodeSchema,
    name: z.string(),
    slug: slugSchema,
    // Mensagens visíveis dos últimos 7 dias que citam a disciplina
    count: z.int().positive(),
  })
  .meta({ id: 'TrendingSubject' })

export type MessageStatus = z.infer<typeof messageStatusSchema>
export type ReportReason = z.infer<typeof reportReasonSchema>
export type MessageInput = z.input<typeof messageInputSchema>
export type ParsedMessageInput = z.output<typeof messageInputSchema>
export type MessageMention = z.infer<typeof messageMentionSchema>
export type MessageView = z.infer<typeof messageSchema>
export type MessagePage = z.infer<typeof messagePageSchema>
export type ForumQuery = z.infer<typeof forumQuerySchema>
export type NewMessagesCount = z.infer<typeof newMessagesCountSchema>
export type ConversationView = z.infer<typeof conversationSchema>
export type LikeState = z.infer<typeof likeStateSchema>
export type SubjectSearchQuery = z.infer<typeof subjectSearchQuerySchema>
export type SubjectSearchResult = z.infer<typeof subjectSearchResultSchema>
export type TrendingSubject = z.infer<typeof trendingSubjectSchema>
