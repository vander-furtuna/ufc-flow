import { z } from 'zod'

import { isoDateTimeSchema, uuidSchema } from '../common/primitives'
import { eventModalitySchema, postStatusSchema } from '../enums'

const textSchema = z.string().trim().min(1)

// Colunas comuns de posts. O slug é gerado pela API a partir do título.
const commonFields = {
  title: textSchema,
  summary: z.string().nullable(),
  // Markdown, renderizado com lista restrita de elementos (sem HTML cru)
  bodyMd: textSchema,
  coverFileId: uuidSchema.nullable(),
  externalUrl: z.url().nullable(),
  status: postStatusSchema,
  pinned: z.boolean(),
  startsAt: isoDateTimeSchema.nullable(),
  endsAt: isoDateTimeSchema.nullable(),
  deadlineAt: isoDateTimeSchema.nullable(),
  location: z.string().nullable(),
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

export type PostInput = z.infer<typeof postInputSchema>
