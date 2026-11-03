// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { emptyLinkForm } from '@/lib/link-page/link-form'

import { LinkForm } from './link-form'
import { LinkPageView, type ViewLink } from './link-page-view'

const S1 = '11111111-1111-4111-8111-111111111111'
const link = (n: number, overrides: Partial<ViewLink> = {}): ViewLink => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  sectionId: null,
  label: `Link ${n}`,
  description: null,
  icon: null,
  thumbnailFileId: null,
  isFeatured: false,
  badge: 'NONE',
  openInSameTab: false,
  ...overrides,
})

const settings = {
  theme: 'CIANO',
  buttonStyle: 'SOFT',
  buttonShape: 'ROUNDED',
  titleFont: 'CLASH',
  bio: 'Links oficiais',
  avatarFileId: null,
  avatarIcon: 'cpu',
  coverFileId: null,
} as const

afterEach(cleanup)

describe('LinkPageView', () => {
  it('destaque no topo, seções, selo e cliques pelo /go', () => {
    render(
      <LinkPageView
        title="Engenharia de Computação"
        settings={settings}
        socialLinks={[
          { id: 'a', network: 'EMAIL', url: 'mailto:coord@ufc.br' },
        ]}
        links={[
          link(1, { sectionId: S1, openInSameTab: true }),
          link(2, { isFeatured: true, badge: 'NEW' }),
          link(3, { fileMime: 'application/pdf' }),
        ]}
        sections={[{ id: S1, title: 'Acadêmico' }]}
        hrefOf={(item) => `/l/eng/go/${item.id}`}
      />,
    )
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Engenharia de Computação',
      }),
    ).toBeTruthy()
    const links = screen
      .getAllByRole('link')
      .filter((item) => item.getAttribute('href')?.startsWith('/l/'))
    expect(links.map((item) => item.textContent)).toEqual([
      'Link 2NOVO(abre em outra aba)',
      'Link 3PDF(abre em outra aba)',
      'Link 1',
    ])
    expect(links[2]!.getAttribute('target')).toBeNull()
    const section = screen.getByRole('heading', { level: 2, name: 'Acadêmico' })
    expect(section).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'E-mail' }).getAttribute('href'),
    ).toBe('mailto:coord@ufc.br')
  })

  it('pré-visualização não navega', () => {
    render(
      <LinkPageView
        compact
        title="Curso"
        settings={settings}
        socialLinks={[]}
        links={[link(1)]}
        sections={[]}
      />,
    )
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.getByText('Link 1')).toBeTruthy()
  })
})

describe('LinkForm', () => {
  it('troca o destino conforme o tipo e só salva com ele preenchido', async () => {
    const onSave = vi.fn(async () => true)
    const user = userEvent.setup()
    render(
      <LinkForm
        initial={emptyLinkForm()}
        courseId="33333333-3333-4333-8333-333333333333"
        sections={[
          { id: S1, title: 'Acadêmico', isVisible: true, position: 0 },
        ]}
        posts={[]}
        isNew
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )
    await user.type(screen.getByLabelText('Título'), 'Grade interativa')
    await user.click(screen.getByRole('button', { name: 'Adicionar link' }))
    expect(screen.getByText('Informe o destino do link')).toBeTruthy()
    expect(onSave).not.toHaveBeenCalled()

    await user.click(screen.getByLabelText('Tela do Flow'))
    await user.selectOptions(
      screen.getByLabelText('Tela do Flow', { selector: 'select' }),
      'GRADE',
    )
    await user.selectOptions(screen.getByLabelText('Seção'), S1)
    await user.click(screen.getByRole('button', { name: 'Ícone: Grade' }))
    const checks = screen.getByLabelText('Destacar com brilho')
    await user.click(checks)
    await user.click(screen.getByRole('button', { name: 'Adicionar link' }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'INTERNAL',
        internalTarget: 'GRADE',
        url: null,
        sectionId: S1,
        icon: 'grid',
        isFeatured: true,
      }),
    )
    expect(
      within(document.body).getByText(/Só um link fica em destaque/),
    ).toBeTruthy()
  })
})
