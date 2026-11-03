import {
  linkInputSchema,
  linkPageSettingsInputSchema,
  type LinkInput,
} from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'

import type { Actor } from '../../../shared/domain/access-policy'
import { DomainError } from '../../../shared/domain/domain-error'
import {
  SequentialIds,
  SteppingClock,
} from '../../catalog/application/testing/in-memory-catalog'
import type { FileRecord } from '../../files/domain/file'
import {
  ManageLinkPageUseCase,
  PublicLinkPageUseCase,
} from './link-page.use-cases'
import { InMemoryLinkPage } from './testing/in-memory-link-page'

const MOD: Actor = {
  userId: 'u-mod',
  isAdmin: false,
  moderatedCourseIds: new Set(['c-eng']),
  enrolledCourseIds: new Set(),
}
const STUDENT: Actor = {
  ...MOD,
  userId: 'u-ana',
  moderatedCourseIds: new Set(),
}

const POST_ID = '5a9fd2b4-9eb2-40bc-abf3-ad9c7f32918e'
const FILE_ID = '6a9fd2b4-9eb2-40bc-abf3-ad9c7f32918e'

const link = (input: Partial<LinkInput>) =>
  linkInputSchema.parse({
    kind: 'URL',
    label: 'SIGAA',
    url: 'https://si3.ufc.br',
    ...input,
  })

const settings = (overrides: Record<string, unknown> = {}) =>
  linkPageSettingsInputSchema.parse({
    slug: 'eng',
    theme: 'VERDE',
    buttonStyle: 'FILLED',
    buttonShape: 'PILL',
    titleFont: 'GEIST',
    isPublished: true,
    bio: 'Links oficiais do curso',
    ...overrides,
  })

const file = (id: string, overrides: Partial<FileRecord> = {}): FileRecord => ({
  id,
  ownerId: 'u-mod',
  courseId: 'c-eng',
  purpose: 'LINK_FILE',
  visibility: 'PUBLIC',
  storageKey: `k/${id}`,
  originalName: 'regulamento.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 100,
  width: null,
  height: null,
  sha256: 'x',
  status: 'PENDING',
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  attachedAt: null,
  deletedAt: null,
  ...overrides,
})

function harness() {
  const store = new InMemoryLinkPage()
  const clock = new SteppingClock('2026-11-03T12:00:00.000Z')
  store.courses = [
    { id: 'c-eng', slug: 'eng', name: 'Engenharia', isActive: true },
    { id: 'c-cc', slug: 'cc', name: 'Computação', isActive: true },
  ]
  store.curricula.set('c-eng', '2006-2')
  store.posts = [
    { id: POST_ID, courseId: 'c-eng', slug: 'monitoria', published: true },
  ]
  return {
    store,
    clock,
    manage: new ManageLinkPageUseCase(store, clock, new SequentialIds()),
    open: new PublicLinkPageUseCase(store, clock),
  }
}

async function rejects(work: Promise<unknown>) {
  try {
    await work
  } catch (error) {
    if (error instanceof DomainError) return error.code
    throw error
  }
  throw new Error('esperava um DomainError')
}

describe('página de links', () => {
  it('nasce despublicada no primeiro acesso de quem modera', async () => {
    const h = harness()
    expect(await rejects(h.manage.get(STUDENT, 'eng'))).toBe('ACCESS_DENIED')
    const page = await h.manage.get(MOD, 'eng')
    expect(page).toMatchObject({
      slug: 'eng',
      isPublished: false,
      theme: 'CIANO',
      links: [],
    })
    expect(await rejects(h.open.page('eng'))).toBe('LINK_PAGE_NOT_FOUND')
    // O slug de outra página não pode ser usado
    h.store.pages.set('c-cc', {
      ...h.store.pages.get('c-eng')!,
      courseId: 'c-cc',
      slug: 'cc',
    })
    expect(
      await rejects(
        h.manage.updateSettings(MOD, 'eng', settings({ slug: 'cc' })),
      ),
    ).toBe('LINK_PAGE_SLUG_TAKEN')
  })

  it('seções, links com destaque único, redes e a página pública', async () => {
    const h = harness()
    await h.manage.updateSettings(MOD, 'eng', settings())
    let page = await h.manage.saveSection(MOD, 'eng', null, {
      title: 'Acadêmico',
      isVisible: true,
    })
    const academic = page.sections[0]!.id
    page = await h.manage.saveSection(MOD, 'eng', null, {
      title: 'Oculta',
      isVisible: false,
    })
    const hidden = page.sections[1]!.id

    await h.manage.saveLink(MOD, 'eng', null, link({ sectionId: academic }))
    await h.manage.saveLink(
      MOD,
      'eng',
      null,
      link({
        label: 'Monitoria',
        kind: 'POST',
        url: null,
        postId: POST_ID,
        isFeatured: true,
      }),
    )
    page = await h.manage.saveLink(
      MOD,
      'eng',
      null,
      link({
        label: 'Grade',
        kind: 'INTERNAL',
        url: null,
        internalTarget: 'GRADE',
        isFeatured: true,
      }),
    )
    expect(
      page.links.filter((item) => item.isFeatured).map((item) => item.label),
    ).toEqual(['Grade'])

    await h.manage.saveLink(
      MOD,
      'eng',
      null,
      link({ label: 'Escondido', sectionId: hidden }),
    )
    await h.manage.saveLink(
      MOD,
      'eng',
      null,
      link({ label: 'Programado', visibleFrom: '2026-11-10T00:00:00.000Z' }),
    )
    page = await h.manage.saveSocialLink(MOD, 'eng', null, {
      network: 'EMAIL',
      url: 'coord@ufc.br',
    })
    expect(page.socialLinks[0]?.url).toBe('mailto:coord@ufc.br')
    expect(page.links.find((item) => item.label === 'Programado')?.status).toBe(
      'SCHEDULED',
    )

    const open = await h.open.page('eng')
    expect(open).toMatchObject({
      theme: 'VERDE',
      course: { slug: 'eng', name: 'Engenharia' },
      sections: [{ title: 'Acadêmico' }],
    })
    expect(open.links.map((item) => item.label)).toEqual([
      'Grade',
      'Monitoria',
      'SIGAA',
    ])
    expect(open.links[0]).not.toHaveProperty('url')

    // Post arquivado some da página
    h.store.posts[0]!.published = false
    expect((await h.open.page('eng')).links.map((item) => item.label)).toEqual([
      'Grade',
      'SIGAA',
    ])
    expect((await h.open.preview('eng')).links).toHaveLength(2)
  })

  it('valida seção, post e arquivo do link', async () => {
    const h = harness()
    await h.manage.get(MOD, 'eng')
    expect(
      await rejects(
        h.manage.saveLink(MOD, 'eng', null, link({ sectionId: POST_ID })),
      ),
    ).toBe('LINK_SECTION_NOT_FOUND')
    h.store.posts.push({
      id: FILE_ID,
      courseId: 'c-cc',
      slug: 'x',
      published: true,
    })
    expect(
      await rejects(
        h.manage.saveLink(
          MOD,
          'eng',
          null,
          link({ kind: 'POST', url: null, postId: FILE_ID }),
        ),
      ),
    ).toBe('POST_NOT_FOUND')
    h.store.files.set(FILE_ID, file(FILE_ID))
    const page = await h.manage.saveLink(
      MOD,
      'eng',
      null,
      link({ label: 'Regulamento', kind: 'FILE', url: null, fileId: FILE_ID }),
    )
    expect(h.store.files.get(FILE_ID)?.status).toBe('ATTACHED')
    await h.manage.removeLink(MOD, 'eng', page.links[0]!.id)
    expect(h.store.files.get(FILE_ID)?.deletedAt).not.toBeNull()
  })

  it('ordem em lote e remoção de seção levando os links ao topo', async () => {
    const h = harness()
    await h.manage.updateSettings(MOD, 'eng', settings())
    let page = await h.manage.saveSection(MOD, 'eng', null, {
      title: 'A',
      isVisible: true,
    })
    page = await h.manage.saveSection(MOD, 'eng', null, {
      title: 'B',
      isVisible: true,
    })
    const [a, b] = page.sections.map((section) => section.id)
    await h.manage.saveLink(
      MOD,
      'eng',
      null,
      link({ label: 'x', sectionId: a! }),
    )
    page = await h.manage.saveLink(
      MOD,
      'eng',
      null,
      link({ label: 'y', sectionId: a! }),
    )
    const [x, y] = page.links.map((item) => item.id)

    page = await h.manage.setOrder(MOD, 'eng', {
      sections: [b!, a!],
      links: [
        { id: y!, sectionId: b! },
        { id: x!, sectionId: a! },
      ],
      socialLinks: [],
    })
    expect(page.sections.map((section) => section.title)).toEqual(['B', 'A'])
    expect((await h.open.page('eng')).links.map((item) => item.label)).toEqual([
      'y',
      'x',
    ])
    expect(
      await rejects(
        h.manage.setOrder(MOD, 'eng', {
          sections: [a!],
          links: [],
          socialLinks: [],
        }),
      ),
    ).toBe('LINK_ORDER_MISMATCH')

    page = await h.manage.removeSection(MOD, 'eng', b!)
    expect(page.links.find((item) => item.id === y)?.sectionId).toBeNull()
  })

  it('clique soma por dia e origem e leva ao destino; visitas e estatísticas', async () => {
    const h = harness()
    await h.manage.updateSettings(MOD, 'eng', settings())
    await h.manage.saveLink(MOD, 'eng', null, link({}))
    let page = await h.manage.saveLink(
      MOD,
      'eng',
      null,
      link({ label: 'Hub', kind: 'POST', url: null, postId: POST_ID }),
    )
    const [sigaa, post] = [
      page.links.find((item) => item.label === 'SIGAA')!,
      page.links.find((item) => item.label === 'Hub')!,
    ]
    expect(await h.open.click('eng', sigaa.id, 'PAGE')).toBe(
      'https://si3.ufc.br',
    )
    expect(await h.open.click('eng', sigaa.id, 'QR')).toBe('https://si3.ufc.br')
    expect(await h.open.click('eng', post.id, 'HUB')).toBe('/eng/hub/monitoria')
    expect(await rejects(h.open.click('eng', FILE_ID, 'PAGE'))).toBe(
      'LINK_NOT_FOUND',
    )
    await h.open.view('eng', 'QR')
    await h.open.view('eng', 'QR')

    page = await h.manage.get(MOD, 'eng')
    expect(page.links.find((item) => item.id === sigaa.id)?.clicks7d).toBe(2)
    const stats = await h.manage.stats(MOD, 'eng', 7)
    expect(stats.views).toEqual([{ day: '2026-11-03', source: 'QR', count: 2 }])
    expect(stats.links[0]).toMatchObject({
      label: 'SIGAA',
      clicks: 2,
      bySource: { PAGE: 1, QR: 1 },
    })
    expect(await rejects(h.manage.stats(STUDENT, 'eng', 7))).toBe(
      'ACCESS_DENIED',
    )
  })
})
