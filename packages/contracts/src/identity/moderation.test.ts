import { describe, expect, it } from 'vitest'

import {
  createModeratorRequestInputSchema,
  moderatorRequestPageSchema,
  moderatorRequestSchema,
  reviewModeratorRequestInputSchema,
} from './moderation'

const request = {
  id: '0b8f6a3e-2c1d-4f5e-9a7b-3c2d1e0f9a8b',
  user: {
    id: '1b8f6a3e-2c1d-4f5e-9a7b-3c2d1e0f9a8b',
    name: 'Ana Souza',
    email: 'ana@alu.ufc.br',
  },
  course: {
    id: '2b8f6a3e-2c1d-4f5e-9a7b-3c2d1e0f9a8b',
    slug: 'engenharia-de-computacao-ufc-sobral',
    name: 'Engenharia de Computação',
  },
  justification: 'Sou do centro acadêmico e mantenho a grade atualizada.',
  status: 'PENDING',
  reviewNote: null,
  reviewedAt: null,
  createdAt: '2026-11-01T12:00:00Z',
}

describe('pedidos de moderação', () => {
  it('pede curso e justificativa de 20 a 1000 caracteres', () => {
    const input = {
      courseId: request.course.id,
      justification: request.justification,
    }
    expect(createModeratorRequestInputSchema.parse(input)).toEqual(input)
    expect(
      createModeratorRequestInputSchema.safeParse({
        ...input,
        justification: 'curta',
      }).success,
    ).toBe(false)
  })

  it('a revisão aceita nota opcional', () => {
    expect(reviewModeratorRequestInputSchema.parse({})).toEqual({})
    expect(
      reviewModeratorRequestInputSchema.safeParse({ note: 'x'.repeat(1001) })
        .success,
    ).toBe(false)
  })

  it('descreve o pedido e a página de pedidos', () => {
    expect(moderatorRequestSchema.parse(request)).toEqual(request)
    expect(
      moderatorRequestPageSchema.safeParse({
        items: [request],
        nextCursor: null,
      }).success,
    ).toBe(true)
  })
})
