import { LINK_PAGE_THEMES } from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'

import { buttonStyle, featuredStyle, themeVars } from './theme-style'

describe('estilo da página de links', () => {
  it('variáveis do tema a partir dos tokens', () => {
    expect(themeVars('ESCURO')).toMatchObject({
      '--lp-bg': LINK_PAGE_THEMES.ESCURO.background,
      '--lp-accent': LINK_PAGE_THEMES.ESCURO.accent,
      '--lp-fg': LINK_PAGE_THEMES.ESCURO.foreground,
    })
  })

  it.each([
    [
      'FILLED',
      'PILL',
      {
        background: 'var(--lp-accent)',
        color: 'var(--lp-on-accent)',
        borderRadius: '999px',
      },
    ],
    [
      'OUTLINE',
      'SQUARE',
      { border: '2px solid var(--lp-accent)', borderRadius: '6px' },
    ],
    [
      'SOFT',
      'ROUNDED',
      { background: 'var(--lp-surface)', borderRadius: '14px' },
    ],
  ] as const)('botão %s %s', (style, shape, expected) => {
    expect(buttonStyle(style, shape)).toMatchObject(expected)
  })

  it('destaque com anel e o mesmo raio', () => {
    expect(featuredStyle('PILL')).toMatchObject({
      borderRadius: '999px',
      border: '2px solid var(--lp-accent)',
    })
  })
})
