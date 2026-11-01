import { z } from 'zod'

import { cursorPage } from '../common/pagination'
import { isoDateTimeSchema, uuidSchema } from '../common/primitives'
import { moderatorRequestStatusSchema } from '../enums'
import { courseSummarySchema } from './auth'

export const createModeratorRequestInputSchema = z
  .object({
    courseId: uuidSchema,
    justification: z
      .string()
      .trim()
      .min(20, 'Conte em pelo menos 20 caracteres por que quer moderar')
      .max(1000),
  })
  .meta({ id: 'CreateModeratorRequestInput' })

export const reviewModeratorRequestInputSchema = z
  .object({ note: z.string().trim().max(1000).optional() })
  .meta({ id: 'ReviewModeratorRequestInput' })

export const moderatorRequestSchema = z
  .object({
    id: uuidSchema,
    user: z.object({ id: uuidSchema, name: z.string(), email: z.string() }),
    course: courseSummarySchema,
    justification: z.string(),
    status: moderatorRequestStatusSchema,
    reviewNote: z.string().nullable(),
    reviewedAt: isoDateTimeSchema.nullable(),
    createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'ModeratorRequest' })

export const moderatorRequestPageSchema = cursorPage(
  moderatorRequestSchema,
).meta({ id: 'ModeratorRequestPage' })

export type CreateModeratorRequestInput = z.infer<
  typeof createModeratorRequestInputSchema
>
export type ReviewModeratorRequestInput = z.infer<
  typeof reviewModeratorRequestInputSchema
>
export type ModeratorRequest = z.infer<typeof moderatorRequestSchema>
