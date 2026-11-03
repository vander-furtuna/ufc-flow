import {
  LINK_PAGE_THEMES,
  type LinkButtonShape,
  type LinkButtonStyle,
  type LinkPageTheme,
} from '@ufc-flow/contracts'
import type { CSSProperties } from 'react'

// Os temas da página de links vêm dos tokens do contracts (D31), não dos do
// web: cada página tem as próprias cores, aplicadas por variáveis CSS
export function themeVars(theme: LinkPageTheme): CSSProperties {
  const tokens = LINK_PAGE_THEMES[theme]
  return {
    '--lp-bg': tokens.background,
    '--lp-accent': tokens.accent,
    '--lp-on-accent': tokens.onAccent,
    '--lp-border': tokens.border,
    '--lp-fg': tokens.foreground,
    '--lp-surface': tokens.surface,
    '--lp-cover': tokens.cover,
    colorScheme: theme === 'ESCURO' ? 'dark' : 'light',
  } as CSSProperties
}

const RADIUS: Record<LinkButtonShape, string> = {
  SQUARE: '6px',
  ROUNDED: '14px',
  PILL: '999px',
}

// Preenchido, contorno ou suave (design-system.md, Página de links)
export function buttonStyle(
  style: LinkButtonStyle,
  shape: LinkButtonShape,
): CSSProperties {
  const borderRadius = RADIUS[shape]
  if (style === 'FILLED') {
    return {
      borderRadius,
      background: 'var(--lp-accent)',
      color: 'var(--lp-on-accent)',
      border: '1px solid var(--lp-accent)',
    }
  }
  if (style === 'OUTLINE') {
    return {
      borderRadius,
      background: 'transparent',
      color: 'var(--lp-fg)',
      border: '2px solid var(--lp-accent)',
    }
  }
  return {
    borderRadius,
    background: 'var(--lp-surface)',
    color: 'var(--lp-fg)',
    border: '1px solid var(--lp-border)',
  }
}

// Link em destaque: superfície com borda e anel no destaque, sempre igual
export function featuredStyle(shape: LinkButtonShape): CSSProperties {
  return {
    borderRadius: RADIUS[shape],
    background: 'var(--lp-surface)',
    color: 'var(--lp-fg)',
    border: '2px solid var(--lp-accent)',
    boxShadow: '0 0 0 4px var(--lp-border)',
  }
}
