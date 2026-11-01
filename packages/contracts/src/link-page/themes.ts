import type { LinkPageTheme } from '../enums'

export type LinkPageThemeTokens = {
  background: string
  // Botões, ícones e realces; também é cor de texto
  accent: string
  // Rótulo do botão preenchido, sobre o destaque
  onAccent: string
  border: string
  foreground: string
  surface: string
  cover: string
}

// Os seis temas prontos da página de links, todos com contraste AA (teste em
// themes.test.ts). Valores do mockup Links-Editor, com o destaque de CIANO,
// LARANJA e VERDE escurecido para o tom 700 (D31).
export const LINK_PAGE_THEMES = {
  CIANO: {
    background: '#ecfeff',
    accent: '#0e7490',
    onAccent: '#ffffff',
    border: '#a5f3fc',
    foreground: '#083344',
    surface: '#ffffff',
    cover: '#cffafe',
  },
  LARANJA: {
    background: '#fff7ed',
    accent: '#c2410c',
    onAccent: '#ffffff',
    border: '#fed7aa',
    foreground: '#7c2d12',
    surface: '#ffffff',
    cover: '#ffedd5',
  },
  VERDE: {
    background: '#f0fdf4',
    accent: '#15803d',
    onAccent: '#ffffff',
    border: '#bbf7d0',
    foreground: '#14532d',
    surface: '#ffffff',
    cover: '#dcfce7',
  },
  VIOLETA: {
    background: '#f5f3ff',
    accent: '#7c3aed',
    onAccent: '#ffffff',
    border: '#ddd6fe',
    foreground: '#4c1d95',
    surface: '#ffffff',
    cover: '#ede9fe',
  },
  BRANCO: {
    background: '#ffffff',
    accent: '#0f172b',
    onAccent: '#ffffff',
    border: '#e2e8f0',
    foreground: '#020618',
    surface: '#f8fafc',
    cover: '#f1f5f9',
  },
  ESCURO: {
    background: '#020618',
    accent: '#22d3ee',
    onAccent: '#020618',
    border: '#314158',
    foreground: '#f8fafc',
    surface: '#1d293d',
    cover: '#1d293d',
  },
} as const satisfies Record<LinkPageTheme, LinkPageThemeTokens>
