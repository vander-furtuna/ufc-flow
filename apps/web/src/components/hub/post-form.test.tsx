// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createPostAction: vi.fn(),
  updatePostAction: vi.fn(),
  push: vi.fn(),
}))

vi.mock('@/lib/hub/hub-actions', () => ({
  createPostAction: mocks.createPostAction,
  updatePostAction: mocks.updatePostAction,
}))
vi.mock('@/lib/hub/use-hub', () => ({
  useInvalidateHub: () => async () => {},
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { emptyPostForm } from '@/lib/hub/post-form'

import { PostForm } from './post-form'

const COURSE = { slug: 'eng', id: '1b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10' }

function renderForm(props: { isAdmin?: boolean } = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <PostForm
        course={COURSE}
        isAdmin={props.isAdmin ?? false}
        initial={emptyPostForm()}
      />
    </QueryClientProvider>,
  )
}

describe('PostForm', () => {
  beforeEach(() => {
    mocks.createPostAction.mockReset()
    mocks.push.mockReset()
  })
  afterEach(cleanup)

  it('mostra os campos do tipo e aponta o prazo que falta', async () => {
    const user = userEvent.setup()
    renderForm()
    expect(screen.queryByLabelText('Prazo')).toBeNull()

    await user.click(screen.getByLabelText('Edital'))
    expect(screen.getByLabelText('Número do edital (opcional)')).toBeTruthy()
    await user.type(screen.getByLabelText('Título'), 'Seleção de monitores')
    await user.type(screen.getByLabelText('Texto'), 'Inscrições pelo SIGAA.')
    await user.click(screen.getByRole('button', { name: 'Criar post' }))

    const deadline = screen.getByLabelText('Prazo')
    expect(deadline.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Informe o prazo')).toBeTruthy()
    expect(mocks.createPostAction).not.toHaveBeenCalled()
  })

  it('cria no curso e vai para a página do post', async () => {
    mocks.createPostAction.mockResolvedValue({
      ok: true,
      data: { slug: 'semana-de-engenharia' },
    })
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByLabelText('Evento'))
    await user.type(screen.getByLabelText('Título'), 'Semana de Engenharia')
    await user.type(
      screen.getByLabelText('Texto'),
      'Palestras e **minicursos**.',
    )
    await user.type(screen.getByLabelText('Início'), '2026-11-18T08:00')
    await user.selectOptions(
      screen.getByLabelText('Modalidade (opcional)'),
      'IN_PERSON',
    )
    await user.click(screen.getByRole('button', { name: 'Pré-visualizar' }))
    expect(screen.getByText('minicursos').tagName).toBe('STRONG')
    await user.click(screen.getByRole('button', { name: 'Criar post' }))

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith('/eng/hub/semana-de-engenharia'),
    )
    expect(mocks.createPostAction).toHaveBeenCalledWith(
      'eng',
      expect.objectContaining({
        type: 'EVENT',
        startsAt: '2026-11-18T11:00:00.000Z',
        attributes: { modality: 'IN_PERSON' },
      }),
    )
  })

  it('admin publica institucional, sem curso; o erro da API aparece', async () => {
    mocks.createPostAction.mockResolvedValue({
      ok: false,
      problem: { code: 'FORBIDDEN', detail: 'Sem permissão', status: 403 },
    })
    const user = userEvent.setup()
    renderForm({ isAdmin: true })

    await user.type(screen.getByLabelText('Título'), 'Matrícula 2027.1')
    await user.type(screen.getByLabelText('Texto'), 'Calendário da matrícula.')
    await user.click(screen.getByLabelText(/Institucional/))
    await user.click(screen.getByRole('button', { name: 'Criar post' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Sem permissão')
    expect(mocks.createPostAction).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ type: 'NEWS' }),
    )
  })
})
