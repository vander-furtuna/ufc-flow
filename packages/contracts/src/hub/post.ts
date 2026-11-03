import { z } from 'zod'

import { cursorPageQuerySchema } from '../common/pagination'
import { isoDateTimeSchema, slugSchema, uuidSchema } from '../common/primitives'
import { eventModalitySchema, postStatusSchema, postTypeSchema } from '../enums'

const textSchema = z.string().trim().min(1)
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable()

// Colunas comuns de posts. O slug é gerado pela API a partir do título.
const commonFields = {
  title: textSchema.max(140, 'Use até 140 caracteres'),
  summary: optionalText(280),
  // Markdown, renderizado com lista restrita de elementos (sem HTML cru)
  bodyMd: textSchema.max(20_000),
  coverFileId: uuidSchema.nullable(),
  // Galeria do post (arquivos POST_IMAGE), em ordem
  imageFileIds: z.array(uuidSchema).max(10).default([]),
  externalUrl: z.url().nullable(),
  status: postStatusSchema,
  pinned: z.boolean(),
  startsAt: isoDateTimeSchema.nullable(),
  endsAt: isoDateTimeSchema.nullable(),
  deadlineAt: isoDateTimeSchema.nullable(),
  location: optionalText(120),
}

const vacanciesSchema = z.int().positive()

// Um objeto por tipo, com o que vai em `attributes` (tabela do Hub do curso)
const newsPostSchema = z.object({
  ...commonFields,
  type: z.literal('NEWS'),
  attributes: z.strictObject({}),
})

const eventPostSchema = z.object({
  ...commonFields,
  type: z.literal('EVENT'),
  startsAt: isoDateTimeSchema,
  attributes: z.strictObject({
    modality: eventModalitySchema.optional(),
    registrationUrl: z.url().optional(),
  }),
})

const scholarshipPostSchema = z.object({
  ...commonFields,
  type: z.literal('SCHOLARSHIP'),
  deadlineAt: isoDateTimeSchema,
  attributes: z.strictObject({
    amountBrl: z.number().nonnegative().optional(),
    vacancies: vacanciesSchema.optional(),
    weeklyHours: z.int().positive().optional(),
    sponsor: z.string().optional(),
    requirements: z.string().optional(),
  }),
})

const extensionProjectPostSchema = z.object({
  ...commonFields,
  type: z.literal('EXTENSION_PROJECT'),
  attributes: z.strictObject({
    coordinator: z.string().optional(),
    vacancies: vacanciesSchema.optional(),
    contact: z.string().optional(),
  }),
})

const callPostSchema = z.object({
  ...commonFields,
  type: z.literal('CALL'),
  deadlineAt: isoDateTimeSchema,
  attributes: z.strictObject({
    number: z.string().optional(),
    issuer: z.string().optional(),
    documentUrl: z.url().optional(),
  }),
})

// Criação e edição de post do hub, usada pelo formulário do web e pela API
export const postInputSchema = z
  .discriminatedUnion('type', [
    newsPostSchema,
    eventPostSchema,
    scholarshipPostSchema,
    extensionProjectPostSchema,
    callPostSchema,
  ])
  .superRefine((post, ctx) => {
    if (
      post.startsAt &&
      post.endsAt &&
      Date.parse(post.endsAt) < Date.parse(post.startsAt)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'O término não pode ser antes do início',
        params: { code: 'POST_ENDS_BEFORE_START' },
      })
    }
  })
  .meta({ id: 'PostInput' })

// Post como a API devolve. `attributes` segue o tipo (ver postInputSchema).
export const postSchema = z
  .object({
    id: uuidSchema,
    // Nulo no post institucional, que aparece no hub de todos os cursos
    courseId: uuidSchema.nullable(),
    type: postTypeSchema,
    title: z.string(),
    slug: slugSchema,
    summary: z.string().nullable(),
    bodyMd: z.string(),
    coverFileId: uuidSchema.nullable(),
    imageFileIds: z.array(uuidSchema),
    externalUrl: z.string().nullable(),
    status: postStatusSchema,
    pinned: z.boolean(),
    publishedAt: isoDateTimeSchema.nullable(),
    startsAt: isoDateTimeSchema.nullable(),
    endsAt: isoDateTimeSchema.nullable(),
    deadlineAt: isoDateTimeSchema.nullable(),
    location: z.string().nullable(),
    attributes: z.record(z.string(), z.unknown()),
    // Bolsa ou edital com o prazo vencido
    closed: z.boolean(),
    author: z.object({ id: uuidSchema, name: z.string() }).nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .meta({ id: 'Post' })

// No feed vai sem o corpo e sem a galeria
export const postListItemSchema = postSchema
  .omit({ bodyMd: true, imageFileIds: true })
  .meta({ id: 'PostListItem' })

const booleanQuery = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')

// ?type=&upcoming=&q=&status=&cursor=&limit=. Rascunhos e arquivados só para
// quem modera o curso.
export const hubQuerySchema = cursorPageQuerySchema.extend({
  type: postTypeSchema.optional(),
  // Eventos que ainda não terminaram
  upcoming: booleanQuery.optional(),
  q: z.string().trim().min(2).max(80).optional(),
  status: postStatusSchema.default('PUBLISHED'),
})

// Fixados vêm à parte, só na primeira página
export const hubFeedSchema = z
  .object({
    pinned: z.array(postListItemSchema),
    items: z.array(postListItemSchema),
    nextCursor: z.string().nullable(),
  })
  .meta({ id: 'HubFeed' })

// Próximos prazos: bolsas e editais abertos e eventos que não começaram
export const hubDeadlineSchema = z
  .object({
    postId: uuidSchema,
    slug: slugSchema,
    type: postTypeSchema,
    title: z.string(),
    // Prazo da bolsa ou do edital, ou o início do evento
    at: isoDateTimeSchema,
    endsAt: isoDateTimeSchema.nullable(),
  })
  .meta({ id: 'HubDeadline' })

export const hubUnreadSchema = z
  .object({ count: z.int().nonnegative() })
  .meta({ id: 'HubUnread' })

export type PostInput = z.input<typeof postInputSchema>
// Já validado (com os padrões aplicados), como chega aos casos de uso
export type ParsedPostInput = z.output<typeof postInputSchema>
export type PostView = z.infer<typeof postSchema>
export type PostListItem = z.infer<typeof postListItemSchema>
export type HubQuery = z.infer<typeof hubQuerySchema>
export type HubFeed = z.infer<typeof hubFeedSchema>
export type HubDeadline = z.infer<typeof hubDeadlineSchema>
export type HubUnread = z.infer<typeof hubUnreadSchema>
