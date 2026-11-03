// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PostMarkdown } from './post-markdown'

describe('PostMarkdown', () => {
  afterEach(cleanup)

  it('mostra a lista permitida e abre links em outra aba', () => {
    const { container } = render(
      <PostMarkdown>
        {
          '## Inscrições\n\nPelo **SIGAA**, com _entrevista_.\n\n- Cálculo\n- Física\n\n> Atenção ao prazo\n\nVeja o [edital](https://ufc.br/edital).'
        }
      </PostMarkdown>,
    )
    expect(
      screen.getByRole('heading', { level: 2, name: 'Inscrições' }),
    ).toBeTruthy()
    expect(container.querySelector('strong')?.textContent).toBe('SIGAA')
    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect(container.querySelector('blockquote')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'edital' })
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('rebaixa o h1 e não renderiza imagens, HTML cru nem javascript:', () => {
    const { container } = render(
      <PostMarkdown>
        {
          '# Título\n\n![foto](https://x.com/a.png)\n\n<script>alert(1)</script><b>cru</b>\n\n[clique](javascript:alert(1))'
        }
      </PostMarkdown>,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
    expect(container.querySelector('h1')).toBeNull()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Título' }),
    ).toBeTruthy()
    const anchor = screen.getByText('clique').closest('a')
    expect(anchor?.getAttribute('href') ?? '').not.toContain('javascript')
  })
})
