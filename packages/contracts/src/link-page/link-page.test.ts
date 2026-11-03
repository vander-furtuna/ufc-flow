import { describe, expect, it } from 'vitest'

import {
  linkInputSchema,
  linkSourceQuerySchema,
  linkStatsQuerySchema,
  socialLinkInputSchema,
} from './link-page'

const ID = '0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10'
const pathsOf = (value: unknown) =>
  linkInputSchema.safeParse(value).error?.issues.map((issue) => issue.path)

describe('link da página', () => {
  it('URL com os padrões aplicados', () => {
    expect(
      linkInputSchema.parse({
        kind: 'URL',
        label: 'SIGAA',
        url: 'https://si3.ufc.br',
        description: ' ',
      }),
    ).toMatchObject({
      url: 'https://si3.ufc.br',
      description: null,
      fileId: null,
      isFeatured: false,
      badge: 'NONE',
      isVisible: true,
    })
  })

  it.each([
    ['FILE', { fileId: ID }],
    ['INTERNAL', { internalTarget: 'GRADE' }],
    ['POST', { postId: ID }],
  ] as const)('%s com o alvo dele', (kind, target) => {
    expect(
      linkInputSchema.safeParse({ kind, label: 'Link', ...target }).success,
    ).toBe(true)
  })

  it('exige o alvo do tipo e recusa os de outro tipo', () => {
    expect(pathsOf({ kind: 'URL', label: 'Link' })).toEqual([['url']])
    expect(
      pathsOf({
        kind: 'FILE',
        label: 'Link',
        fileId: ID,
        url: 'https://x.com',
      }),
    ).toEqual([['url']])
    expect(
      pathsOf({ kind: 'URL', label: 'Link', url: 'javascript:alert(1)' }),
    ).toEqual([['url']])
  })

  it('período com fim depois do início', () => {
    expect(
      pathsOf({
        kind: 'URL',
        label: 'Link',
        url: 'https://x.com',
        visibleFrom: '2026-11-14T00:00:00Z',
        visibleUntil: '2026-11-10T00:00:00Z',
      }),
    ).toEqual([['visibleUntil']])
  })

  it('rede social: e-mail puro ou mailto; demais em http', () => {
    const ok = (network: string, url: string) =>
      socialLinkInputSchema.safeParse({ network, url }).success
    expect(ok('EMAIL', 'coord@ufc.br')).toBe(true)
    expect(ok('EMAIL', 'mailto:coord@ufc.br')).toBe(true)
    expect(ok('EMAIL', 'coord')).toBe(false)
    expect(ok('INSTAGRAM', 'https://instagram.com/ecomp')).toBe(true)
    expect(ok('INSTAGRAM', 'instagram.com/ecomp')).toBe(false)
  })

  it('origem do clique e janela das estatísticas', () => {
    expect(linkSourceQuerySchema.parse({}).src).toBe('PAGE')
    expect(linkSourceQuerySchema.parse({ src: 'qr' }).src).toBe('QR')
    expect(linkSourceQuerySchema.safeParse({ src: 'x' }).success).toBe(false)
    expect(linkStatsQuerySchema.parse({ days: '30' }).days).toBe(30)
    expect(linkStatsQuerySchema.safeParse({ days: '10' }).success).toBe(false)
  })
})
