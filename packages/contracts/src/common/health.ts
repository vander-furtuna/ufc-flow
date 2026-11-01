import { z } from 'zod'

export const healthSchema = z
  .object({ status: z.literal('ok'), database: z.literal('ok') })
  .meta({ id: 'Health' })

export type Health = z.infer<typeof healthSchema>
