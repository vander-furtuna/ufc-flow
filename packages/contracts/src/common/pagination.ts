import { z } from 'zod'

// Query da paginação por cursor (?cursor=&limit=). O cursor é opaco para o
// cliente: só se repassa o nextCursor da página anterior.
export const cursorPageQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CursorPageQuery = z.infer<typeof cursorPageQuerySchema>

// Página de resultados; nextCursor é null na última
export function cursorPage<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  })
}

export type CursorPage<T> = { items: T[]; nextCursor: string | null }
