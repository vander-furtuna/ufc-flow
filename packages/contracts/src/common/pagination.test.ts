import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { cursorPage, cursorPageQuerySchema } from './pagination'

describe('cursorPageQuerySchema', () => {
  it('usa 20 itens por padrão', () => {
    expect(cursorPageQuerySchema.parse({})).toEqual({ limit: 20 })
  })

  it('lê o limite da query string', () => {
    expect(cursorPageQuerySchema.parse({ cursor: 'abc', limit: '50' })).toEqual(
      { cursor: 'abc', limit: 50 },
    )
  })

  it('aceita de 1 a 100 itens', () => {
    expect(cursorPageQuerySchema.safeParse({ limit: '0' }).success).toBe(false)
    expect(cursorPageQuerySchema.safeParse({ limit: '101' }).success).toBe(
      false,
    )
    expect(cursorPageQuerySchema.safeParse({ limit: '2.5' }).success).toBe(
      false,
    )
  })

  it('recusa cursor vazio', () => {
    expect(cursorPageQuerySchema.safeParse({ cursor: '' }).success).toBe(false)
  })
})

describe('cursorPage', () => {
  const page = cursorPage(z.object({ id: z.string() }))

  it('aceita a página com o próximo cursor ou null no fim', () => {
    expect(
      page.safeParse({ items: [{ id: 'a' }], nextCursor: 'b' }).success,
    ).toBe(true)
    expect(page.safeParse({ items: [], nextCursor: null }).success).toBe(true)
  })

  it('valida cada item', () => {
    expect(
      page.safeParse({ items: [{ id: 1 }], nextCursor: null }).success,
    ).toBe(false)
  })
})
