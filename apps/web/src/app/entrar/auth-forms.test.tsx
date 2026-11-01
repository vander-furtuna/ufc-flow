// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { signInAction, signUpAction } from '@/lib/auth/actions'

import { SignInForm, SignUpForm } from './auth-forms'
import { AuthScreen } from './auth-screen'

const router = { replace: vi.fn(), refresh: vi.fn() }

vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/lib/auth/actions', () => ({
  signInAction: vi.fn(),
  signUpAction: vi.fn(),
  signOutAction: vi.fn(),
}))

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient()
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

// O checkbox do Radix mede o próprio tamanho; o jsdom não tem ResizeObserver
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

beforeEach(() => {
  vi.clearAllMocks()
})
afterEach(cleanup)

describe('SignInForm', () => {
  it('valida no navegador antes de chamar a API', async () => {
    const user = userEvent.setup()
    renderWithQuery(<SignInForm next="/cursos" />)

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('E-mail inválido')).toBeTruthy()
    expect(signInAction).not.toHaveBeenCalled()
  })

  it('entra e vai para o destino', async () => {
    vi.mocked(signInAction).mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    renderWithQuery(<SignInForm next="/eng-computacao" />)

    await user.type(screen.getByLabelText('E-mail'), 'ana@alu.ufc.br')
    await user.type(screen.getByLabelText('Senha'), 'senha-boa-123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/eng-computacao'),
    )
    expect(signInAction).toHaveBeenCalledWith({
      email: 'ana@alu.ufc.br',
      password: 'senha-boa-123',
    })
    expect(router.refresh).toHaveBeenCalled()
  })

  it('mostra o erro da API como alerta', async () => {
    vi.mocked(signInAction).mockResolvedValue({
      ok: false,
      problem: {
        code: 'INVALID_CREDENTIALS',
        detail: 'E-mail ou senha incorretos',
      },
    })
    const user = userEvent.setup()
    renderWithQuery(<SignInForm next="/cursos" />)

    await user.type(screen.getByLabelText('E-mail'), 'ana@alu.ufc.br')
    await user.type(screen.getByLabelText('Senha'), 'senha-errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'E-mail ou senha incorretos',
    )
    expect(router.replace).not.toHaveBeenCalled()
  })
})

describe('SignUpForm', () => {
  async function fill(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('Nome'), 'Ana Souza')
    await user.type(screen.getByLabelText('E-mail'), 'ana@alu.ufc.br')
    await user.type(screen.getByLabelText('Senha'), 'senha-boa-123')
  }

  it('exige o aceite dos termos e da privacidade', async () => {
    const user = userEvent.setup()
    renderWithQuery(<SignUpForm next="/cursos" />)

    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(
      await screen.findByText(
        'Aceite os Termos de uso e a Política de privacidade',
      ),
    ).toBeTruthy()
    expect(signUpAction).not.toHaveBeenCalled()
  })

  it('envia os dois aceites a partir da caixa única', async () => {
    vi.mocked(signUpAction).mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    renderWithQuery(<SignUpForm next="/cursos" />)

    await fill(user)
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/cursos'))
    expect(signUpAction).toHaveBeenCalledWith({
      name: 'Ana Souza',
      email: 'ana@alu.ufc.br',
      password: 'senha-boa-123',
      acceptTerms: true,
      acceptPrivacy: true,
    })
  })

  it('leva os erros de campo da API para o campo', async () => {
    vi.mocked(signUpAction).mockResolvedValue({
      ok: false,
      problem: {
        code: 'VALIDATION_FAILED',
        detail: 'Confira os campos',
        errors: [
          { path: ['email'], message: 'Use outro e-mail', code: 'custom' },
        ],
      },
    })
    const user = userEvent.setup()
    renderWithQuery(<SignUpForm next="/cursos" />)

    await fill(user)
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('Use outro e-mail')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('AuthScreen', () => {
  it('troca título e formulário pela aba e guarda a aba na URL', async () => {
    const user = userEvent.setup()
    renderWithQuery(<AuthScreen initialTab="entrar" next="/cursos" />)

    expect(
      screen.getByRole('heading', { name: 'Bem-vindo de volta' }),
    ).toBeTruthy()

    await user.click(screen.getByRole('tab', { name: 'Criar conta' }))

    expect(screen.getByRole('heading', { name: 'Crie sua conta' })).toBeTruthy()
    expect(screen.getByLabelText('Nome')).toBeTruthy()
    expect(window.location.search).toBe('?aba=criar')

    await user.click(screen.getByRole('tab', { name: 'Entrar' }))
    expect(window.location.search).toBe('')
  })

  it('oferece continuar sem conta para o destino', () => {
    renderWithQuery(<AuthScreen initialTab="entrar" next="/eng-computacao" />)

    expect(
      screen
        .getByRole('link', { name: 'Continuar sem conta' })
        .getAttribute('href'),
    ).toBe('/eng-computacao')
  })
})
