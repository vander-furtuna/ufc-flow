import { describe, expect, it } from 'vitest'

import { linkPageThemeSchema } from '../enums'
import { LINK_PAGE_THEMES } from './themes'

// Contraste WCAG 2.x entre duas cores #rrggbb
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ]
  return (light + 0.05) / (dark + 0.05)
}

describe('contrast', () => {
  it('confere com os valores de referência do WCAG', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21)
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1)
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })
})

describe('LINK_PAGE_THEMES', () => {
  it('tem um tema para cada valor do enum, todos com #rrggbb', () => {
    expect(Object.keys(LINK_PAGE_THEMES)).toEqual(linkPageThemeSchema.options)
    for (const theme of Object.values(LINK_PAGE_THEMES)) {
      for (const color of Object.values(theme)) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })

  // Combinações usadas na página (Links-Editor): texto sobre fundo, superfície
  // e capa; rótulo do botão preenchido; destaque usado como texto e ícone.
  describe.each(Object.entries(LINK_PAGE_THEMES))('%s', (_, theme) => {
    it.each([
      ['texto sobre o fundo', theme.foreground, theme.background],
      ['texto sobre a superfície', theme.foreground, theme.surface],
      ['texto sobre a capa', theme.foreground, theme.cover],
      ['rótulo do botão preenchido', theme.onAccent, theme.accent],
      ['destaque sobre o fundo', theme.accent, theme.background],
      ['destaque sobre a superfície', theme.accent, theme.surface],
    ])('%s passa no AA (4,5:1)', (_, color, background) => {
      expect(contrast(color, background)).toBeGreaterThanOrEqual(4.5)
    })
  })
})
