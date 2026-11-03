import { describe, expect, it } from 'vitest'

import {
  deadlineOf,
  editPost,
  isClosed,
  newPost,
  postSlug,
  unreadSince,
  type Post,
  type PostFields,
} from './post'

const NOW = new Date('2026-11-02T12:00:00.000Z')
const LATER = new Date('2026-11-05T12:00:00.000Z')

const fields = (overrides: Partial<PostFields> = {}): PostFields => ({
  type: 'NEWS',
  title: 'Laboratório recebe novos kits',
  summary: null,
  bodyMd: 'Os kits ficam disponíveis em dezembro.',
  coverFileId: null,
  imageFileIds: [],
  externalUrl: null,
  status: 'DRAFT',
  pinned: false,
  startsAt: null,
  endsAt: null,
  deadlineAt: null,
  location: null,
  attributes: {},
  ...overrides,
})

const create = (overrides: Partial<PostFields> = {}, now = NOW): Post =>
  newPost({
    id: 'p1',
    courseId: 'c1',
    authorId: 'u1',
    slug: 'laboratorio-recebe-novos-kits',
    fields: fields(overrides),
    now,
  })

describe('post do hub', () => {
  it('slug pelo título, sem repetir no curso', () => {
    expect(postSlug('Seleção de Monitores 2026.2', new Set())).toBe(
      'selecao-de-monitores-2026-2',
    )
    expect(
      postSlug(
        'Seleção de monitores 2026.2',
        new Set([
          'selecao-de-monitores-2026-2',
          'selecao-de-monitores-2026-2-2',
        ]),
      ),
    ).toBe('selecao-de-monitores-2026-2-3')
    expect(postSlug('!!!', new Set())).toBe('post')
  })

  it('rascunho não tem data de publicação; publicar marca a primeira vez', () => {
    const draft = create()
    expect(draft.publishedAt).toBeNull()
    const published = editPost(draft, fields({ status: 'PUBLISHED' }), LATER)
    expect(published.publishedAt).toEqual(LATER)
    // Republicar ou arquivar não muda a data de publicação
    const archived = editPost(
      published,
      fields({ status: 'ARCHIVED' }),
      new Date('2026-11-09T00:00:00.000Z'),
    )
    expect(archived.publishedAt).toEqual(LATER)
    expect(create({ status: 'PUBLISHED' }).publishedAt).toEqual(NOW)
  })

  it('editar mantém o slug e troca os campos', () => {
    const edited = editPost(
      create(),
      fields({ title: 'Outro título', pinned: true }),
      LATER,
    )
    expect(edited).toMatchObject({
      slug: 'laboratorio-recebe-novos-kits',
      title: 'Outro título',
      pinned: true,
      updatedAt: LATER,
    })
  })

  it('bolsa e edital fecham depois do prazo', () => {
    const scholarship = create({
      type: 'SCHOLARSHIP',
      deadlineAt: '2026-11-04T23:59:00.000Z',
    })
    expect(isClosed(scholarship, NOW)).toBe(false)
    expect(isClosed(scholarship, LATER)).toBe(true)
    expect(isClosed(create(), LATER)).toBe(false)
  })

  it('próximo prazo: prazo da bolsa ou início do evento', () => {
    expect(
      deadlineOf(create({ type: 'CALL', deadlineAt: '2026-11-14T00:00:00Z' })),
    ).toEqual(new Date('2026-11-14T00:00:00Z'))
    expect(
      deadlineOf(create({ type: 'EVENT', startsAt: '2026-11-18T12:00:00Z' })),
    ).toEqual(new Date('2026-11-18T12:00:00Z'))
    expect(deadlineOf(create())).toBeNull()
  })

  it('novidades desde a última visita, ou dos últimos 7 dias', () => {
    expect(unreadSince(LATER, NOW)).toEqual(LATER)
    expect(unreadSince(null, NOW)).toEqual(new Date('2026-10-26T12:00:00.000Z'))
  })
})
