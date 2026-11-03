import type { ManagedLinkPage } from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'

import {
  emptyLinkForm,
  fromDayInput,
  linkFormFromManaged,
  linkMeta,
  toDayInput,
  validateLinkForm,
} from './link-form'

type Link = ManagedLinkPage['links'][number]
const managed = (overrides: Partial<Link> = {}): Link => ({
  id: '00000000-0000-4000-8000-000000000001',
  sectionId: null,
  kind: 'URL',
  label: 'SIGAA',
  description: null,
  icon: 'graduation-cap',
  thumbnailFileId: null,
  isFeatured: false,
  badge: 'NONE',
  openInSameTab: false,
  url: 'https://si3.ufc.br/sigaa',
  fileId: null,
  internalTarget: null,
  postId: null,
  visibleFrom: null,
  visibleUntil: null,
  isVisible: true,
  position: 0,
  status: 'ACTIVE',
  clicks7d: 12,
  ...overrides,
})

describe('período do link em dias de Fortaleza', () => {
  it('início no começo do dia e fim no último minuto', () => {
    expect(fromDayInput('2026-10-30', 'start')).toBe('2026-10-30T03:00:00.000Z')
    expect(fromDayInput('2026-11-14', 'end')).toBe('2026-11-15T02:59:59.000Z')
    expect(fromDayInput('', 'start')).toBeNull()
    expect(toDayInput('2026-11-15T02:59:59.000Z')).toBe('2026-11-14')
    expect(toDayInput(null)).toBe('')
  })
})

describe('validateLinkForm', () => {
  it('só o destino do tipo vai para a API', () => {
    const result = validateLinkForm({
      ...emptyLinkForm(),
      kind: 'INTERNAL',
      label: 'Grade interativa',
      url: 'https://sobrou.do.tipo.anterior',
      internalTarget: 'GRADE',
      isFeatured: true,
      isNew: true,
      visibleUntil: '2026-12-12',
    })
    expect(result.ok && result.input).toMatchObject({
      kind: 'INTERNAL',
      url: null,
      internalTarget: 'GRADE',
      isFeatured: true,
      badge: 'NEW',
      visibleUntil: '2026-12-13T02:59:59.000Z',
    })
  })

  it('aponta o destino que falta e o período invertido', () => {
    const result = validateLinkForm({
      ...emptyLinkForm(),
      label: 'Sem destino',
      visibleFrom: '2026-11-20',
      visibleUntil: '2026-11-10',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual({
      url: 'Informe o destino do link',
      visibleUntil: 'O fim precisa ser depois do início',
    })
  })

  it('carrega o link para edição', () => {
    expect(
      linkFormFromManaged(
        managed({ badge: 'NEW', visibleFrom: '2026-10-30T03:00:00.000Z' }),
      ),
    ).toMatchObject({
      kind: 'URL',
      url: 'https://si3.ufc.br/sigaa',
      isNew: true,
      visibleFrom: '2026-10-30',
      icon: 'graduation-cap',
    })
  })
})

describe('linkMeta', () => {
  it.each([
    [managed(), 'si3.ufc.br'],
    [managed({ kind: 'FILE', url: null, fileId: 'x' }), 'Arquivo'],
    [
      managed({ kind: 'INTERNAL', url: null, internalTarget: 'GRADE' }),
      'Tela do Flow · Grade',
    ],
    [managed({ kind: 'POST', url: null, postId: 'x' }), 'Post do hub'],
    [managed({ status: 'HIDDEN' }), 'Oculto · si3.ufc.br'],
    [managed({ status: 'SCHEDULED' }), 'Programado · si3.ufc.br'],
  ])('%#', (link, expected) => {
    expect(linkMeta(link)).toBe(expected)
  })
})
