import type { ManagedLinkPage } from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'

import {
  editorGroups,
  groupLinks,
  moveItem,
  orderInput,
  previewOf,
} from './link-tree'

const S1 = '11111111-1111-4111-8111-111111111111'
const S2 = '22222222-2222-4222-8222-222222222222'
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`

type Link = ManagedLinkPage['links'][number]
const link = (n: number, overrides: Partial<Link> = {}): Link => ({
  id: id(n),
  sectionId: null,
  kind: 'URL',
  label: `Link ${n}`,
  description: null,
  icon: null,
  thumbnailFileId: null,
  isFeatured: false,
  badge: 'NONE',
  openInSameTab: false,
  url: 'https://ufc.br',
  fileId: null,
  internalTarget: null,
  postId: null,
  visibleFrom: null,
  visibleUntil: null,
  isVisible: true,
  position: n,
  status: 'ACTIVE',
  clicks7d: 0,
  ...overrides,
})

const page: ManagedLinkPage = {
  slug: 'eng',
  bio: null,
  avatarFileId: null,
  avatarIcon: null,
  coverFileId: null,
  theme: 'CIANO',
  buttonStyle: 'SOFT',
  buttonShape: 'ROUNDED',
  titleFont: 'CLASH',
  courseId: '33333333-3333-4333-8333-333333333333',
  isPublished: true,
  updatedAt: '2026-11-03T12:00:00.000Z',
  // A API devolve as seções e os links em ordem
  sections: [
    { id: S2, title: 'Comunidade', isVisible: true, position: 1 },
    { id: S1, title: 'Acadêmico', isVisible: false, position: 0 },
  ],
  links: [
    link(1, { isFeatured: true }),
    link(2),
    link(3, { sectionId: S1 }),
    link(4, { sectionId: S2, status: 'EXPIRED' }),
    link(5, { sectionId: S2 }),
  ],
  socialLinks: [],
}

describe('groupLinks', () => {
  it('destaque à parte, sem seção no topo, seções na ordem e vazias fora', () => {
    const tree = groupLinks(page.links, [
      { id: S1, title: 'Acadêmico' },
      { id: S2, title: 'Comunidade' },
      { id: id(9), title: 'Vazia' },
    ])
    expect(tree.featured?.id).toBe(id(1))
    expect(tree.top.map((item) => item.id)).toEqual([id(2)])
    expect(
      tree.sections.map((section) => [
        section.title,
        section.links.map((item) => item.id),
      ]),
    ).toEqual([
      ['Acadêmico', [id(3)]],
      ['Comunidade', [id(4), id(5)]],
    ])
  })
})

describe('editor', () => {
  it('agrupa por posição da seção e mantém as vazias', () => {
    const groups = editorGroups(page)
    expect(groups.map((group) => group.section?.title ?? null)).toEqual([
      null,
      'Acadêmico',
      'Comunidade',
    ])
    expect(groups[0]!.links.map((item) => item.id)).toEqual([id(1), id(2)])
  })

  it('prévia só com o que está no ar: seção oculta e link expirado saem', () => {
    const preview = previewOf(page)
    expect(preview.sections.map((section) => section.title)).toEqual([
      'Comunidade',
    ])
    expect(preview.links.map((item) => item.id)).toEqual([id(1), id(2), id(5)])
  })

  it('ordem em lote com seção de cada link', () => {
    expect(orderInput(page)).toEqual({
      sections: [S1, S2],
      links: [
        { id: id(1), sectionId: null },
        { id: id(2), sectionId: null },
        { id: id(3), sectionId: S1 },
        { id: id(4), sectionId: S2 },
        { id: id(5), sectionId: S2 },
      ],
      socialLinks: [],
    })
  })

  it('moveItem leva um id para a posição do outro', () => {
    expect(moveItem(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b'])
    expect(moveItem(['a', 'b', 'c'], 'a', 'b')).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b'], 'a', 'x')).toEqual(['a', 'b'])
  })
})
