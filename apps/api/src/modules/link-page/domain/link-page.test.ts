import { describe, expect, it } from 'vitest'

import { DomainError } from '../../../shared/domain/domain-error'
import {
  applyOrder,
  isPubliclyVisible,
  linkStatus,
  linkTarget,
  publicOrder,
  socialUrl,
  type CourseLink,
  type LinkSection,
} from './link-page'

const NOW = new Date('2026-11-03T12:00:00.000Z')

let next = 1
const link = (overrides: Partial<CourseLink> = {}): CourseLink => ({
  id: `l${next++}`,
  courseId: 'c1',
  sectionId: null,
  kind: 'URL',
  label: 'SIGAA',
  description: null,
  url: 'https://si3.ufc.br',
  fileId: null,
  internalTarget: null,
  postId: null,
  icon: null,
  thumbnailFileId: null,
  isFeatured: false,
  badge: 'NONE',
  openInSameTab: false,
  visibleFrom: null,
  visibleUntil: null,
  isVisible: true,
  position: 0,
  createdBy: 'u1',
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
})

const section = (
  id: string,
  position: number,
  isVisible = true,
): LinkSection => ({
  id,
  courseId: 'c1',
  title: id,
  position,
  isVisible,
})

const codeOf = (fn: () => unknown) => {
  try {
    fn()
  } catch (error) {
    if (error instanceof DomainError) return error.code
    throw error
  }
  return null
}

describe('página de links', () => {
  it.each([
    [{}, 'ACTIVE'],
    [{ isVisible: false }, 'HIDDEN'],
    [{ visibleFrom: new Date('2026-11-10T00:00:00Z') }, 'SCHEDULED'],
    [{ visibleUntil: new Date('2026-11-01T00:00:00Z') }, 'EXPIRED'],
    [
      {
        visibleFrom: new Date('2026-11-01T00:00:00Z'),
        visibleUntil: new Date('2026-11-14T00:00:00Z'),
      },
      'ACTIVE',
    ],
  ] as const)('situação %o → %s', (overrides, status) => {
    expect(linkStatus(link(overrides), NOW)).toBe(status)
  })

  it('público: ativo, em seção visível e post publicado', () => {
    const sections = [section('s1', 0), section('oculta', 1, false)]
    const visible = (overrides: Partial<CourseLink>, postPublished = true) =>
      isPubliclyVisible(link(overrides), sections, NOW, postPublished)
    expect(visible({})).toBe(true)
    expect(visible({ sectionId: 's1' })).toBe(true)
    expect(visible({ sectionId: 'oculta' })).toBe(false)
    expect(visible({ isVisible: false })).toBe(false)
    expect(visible({ kind: 'POST', url: null, postId: 'p1' }, false)).toBe(
      false,
    )
  })

  it('ordem pública: destaque, sem seção, depois as seções em ordem', () => {
    const sections = [section('b', 1), section('a', 0)]
    const links = [
      link({ id: 'em-b', sectionId: 'b', position: 0 }),
      link({ id: 'topo-2', position: 2 }),
      link({ id: 'em-a', sectionId: 'a', position: 0 }),
      link({ id: 'destaque', sectionId: 'a', position: 1, isFeatured: true }),
      link({ id: 'topo-1', position: 1 }),
    ]
    expect(publicOrder(links, sections).map((item) => item.id)).toEqual([
      'destaque',
      'topo-1',
      'topo-2',
      'em-a',
      'em-b',
    ])
  })

  it('ordem em lote: posições novas e a seção de cada link', () => {
    const sections = [section('a', 0), section('b', 1)]
    const links = [link({ id: 'x' }), link({ id: 'y', sectionId: 'a' })]
    const result = applyOrder(
      { sections, links, socialLinks: [] },
      {
        sections: ['b', 'a'],
        links: [
          { id: 'y', sectionId: null },
          { id: 'x', sectionId: 'b' },
        ],
        socialLinks: [],
      },
    )
    expect(result.sections.map((item) => [item.id, item.position])).toEqual([
      ['b', 0],
      ['a', 1],
    ])
    expect(
      result.links.map((item) => [item.id, item.sectionId, item.position]),
    ).toEqual([
      ['y', null, 0],
      ['x', 'b', 0],
    ])
    // Precisa trazer todos, sem estranhos
    expect(
      codeOf(() =>
        applyOrder(
          { sections, links, socialLinks: [] },
          { sections: ['a'], links: [], socialLinks: [] },
        ),
      ),
    ).toBe('LINK_ORDER_MISMATCH')
    expect(
      codeOf(() =>
        applyOrder(
          { sections, links, socialLinks: [] },
          {
            sections: ['a', 'b'],
            links: [
              { id: 'x', sectionId: 'nada' },
              { id: 'y', sectionId: null },
            ],
            socialLinks: [],
          },
        ),
      ),
    ).toBe('LINK_ORDER_MISMATCH')
  })

  it('destino do clique pelo tipo do link', () => {
    const ctx = {
      courseSlug: 'eng',
      curriculumSlug: '2006-2',
      postSlug: 'monitoria',
    }
    expect(linkTarget(link(), ctx)).toBe('https://si3.ufc.br')
    expect(
      linkTarget(link({ kind: 'FILE', url: null, fileId: 'f1' }), ctx),
    ).toBe('/arquivos/f1')
    expect(
      linkTarget(link({ kind: 'POST', url: null, postId: 'p1' }), ctx),
    ).toBe('/eng/hub/monitoria')
    const internal = (internalTarget: CourseLink['internalTarget']) =>
      linkTarget(link({ kind: 'INTERNAL', url: null, internalTarget }), ctx)
    expect(internal('GRADE')).toBe('/eng/2006-2')
    expect(internal('AGENDA')).toBe('/eng/2006-2/agenda')
    expect(internal('HUB')).toBe('/eng/hub')
    expect(internal('CALENDARIO')).toBe('/calendario')
    expect(internal('RU')).toBe('/restaurante')
    // Sem EC vigente, a grade cai na lista de cursos
    expect(
      linkTarget(
        link({ kind: 'INTERNAL', url: null, internalTarget: 'GRADE' }),
        {
          ...ctx,
          curriculumSlug: null,
        },
      ),
    ).toBe('/cursos')
  })

  it('e-mail das redes vira mailto', () => {
    expect(socialUrl('EMAIL', 'coord@ufc.br')).toBe('mailto:coord@ufc.br')
    expect(socialUrl('EMAIL', 'MAILTO:coord@ufc.br')).toBe(
      'mailto:coord@ufc.br',
    )
    expect(socialUrl('SITE', 'https://ufc.br')).toBe('https://ufc.br')
  })
})
