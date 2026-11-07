// @vitest-environment jsdom
import type { AdminUser } from '@ufc-flow/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  acceptConsentsAction: vi.fn(),
  deleteAccountAction: vi.fn(),
  listUsersAction: vi.fn(),
  suspendUserAction: vi.fn(),
  reactivateUserAction: vi.fn(),
  passwordResetLinkAction: vi.fn(),
  discardEvaluationsAction: vi.fn(),
  signOutAction: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}))
vi.mock('@/lib/account/account-actions', () => ({
  acceptConsentsAction: mocks.acceptConsentsAction,
  deleteAccountAction: mocks.deleteAccountAction,
  listUsersAction: mocks.listUsersAction,
  suspendUserAction: mocks.suspendUserAction,
  reactivateUserAction: mocks.reactivateUserAction,
  passwordResetLinkAction: mocks.passwordResetLinkAction,
  discardEvaluationsAction: mocks.discardEvaluationsAction,
}))
vi.mock('@/lib/auth/actions', () => ({ signOutAction: mocks.signOutAction }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { ConsentAcceptance } from '@/app/aceitar-termos/consent-acceptance'
import { UsersManager } from '@/app/admin/usuarios/users-manager'
import { DeleteAccountDialog } from '@/app/minha-area/conta/delete-account-dialog'

import { consentRedirect } from './consent-gate'

const wrap = (node: ReactNode) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {node}
    </QueryClientProvider>,
  )

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset()
})
afterEach(cleanup)

describe('consentRedirect', () => {
  it.each([
    ['sem pendência', [], '/cursos', null],
    ['anônimo', undefined, '/cursos', null],
    [
      'com pendência',
      ['TERMS'],
      '/minha-area/historico',
      '/aceitar-termos?next=%2Fminha-area%2Fhistorico',
    ],
    ['na tela de aceite', ['TERMS'], '/aceitar-termos', null],
    ['lendo os termos', ['PRIVACY'], '/privacidade', null],
    ['na conta, para excluir', ['TERMS'], '/minha-area/conta', null],
    [
      'prefixo parecido não libera',
      ['TERMS'],
      '/termosx',
      '/aceitar-termos?next=%2Ftermosx',
    ],
  ])('%s', (_, pending, pathname, expected) => {
    expect(consentRedirect(pending, pathname)).toBe(expected)
  })
})

describe('ConsentAcceptance', () => {
  it('mostra os documentos pendentes e volta para onde estava ao aceitar', async () => {
    const user = userEvent.setup()
    mocks.acceptConsentsAction.mockResolvedValue({
      ok: true,
      data: { pendingConsents: [] },
    })
    wrap(<ConsentAcceptance pending={['TERMS', 'PRIVACY']} next="/cursos" />)
    expect(
      screen.getByRole('link', { name: /Termos de uso.*Versão 1\.0/ }),
    ).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: /Baixar meus dados/ })
        .getAttribute('href'),
    ).toBe('/api/me/export')
    await user.click(screen.getByRole('button', { name: 'Li e aceito' }))
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/cursos'))
  })

  it('mostra o erro da API', async () => {
    const user = userEvent.setup()
    mocks.acceptConsentsAction.mockResolvedValue({
      ok: false,
      problem: { code: 'CONSENT_VERSION_OUTDATED', detail: 'Recarregue' },
    })
    wrap(<ConsentAcceptance pending={['TERMS']} next="/cursos" />)
    await user.click(screen.getByRole('button', { name: 'Li e aceito' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Recarregue')
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('sair encerra a sessão e vai para os cursos', async () => {
    const user = userEvent.setup()
    mocks.signOutAction.mockResolvedValue(undefined)
    wrap(<ConsentAcceptance pending={['TERMS']} next="/cursos" />)
    await user.click(screen.getByRole('button', { name: 'Sair' }))
    await waitFor(() => expect(mocks.signOutAction).toHaveBeenCalled())
    expect(mocks.replace).toHaveBeenCalledWith('/cursos')
  })
})

describe('DeleteAccountDialog', () => {
  const open = async () => {
    const user = userEvent.setup()
    wrap(<DeleteAccountDialog isAdmin={false} />)
    await user.click(
      screen.getByRole('button', { name: 'Excluir minha conta' }),
    )
    return { user, dialog: await screen.findByRole('dialog') }
  }

  it('explica o que é apagado e o que fica, e pede a senha', async () => {
    const { user, dialog } = await open()
    expect(within(dialog).getByText('Apagado de vez')).toBeTruthy()
    expect(within(dialog).getByText('Fica, sem o seu nome')).toBeTruthy()
    await user.click(
      within(dialog).getByRole('button', { name: 'Excluir de vez' }),
    )
    expect(within(dialog).getByText('Informe a senha')).toBeTruthy()
    expect(mocks.deleteAccountAction).not.toHaveBeenCalled()
  })

  it('senha errada mostra o erro e não sai da página', async () => {
    mocks.deleteAccountAction.mockResolvedValue({
      ok: false,
      problem: { code: 'PASSWORD_MISMATCH', detail: 'Senha incorreta' },
    })
    const { user, dialog } = await open()
    await user.type(
      within(dialog).getByLabelText('Confirme com a sua senha'),
      'errada',
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Excluir de vez' }),
    )
    expect(await within(dialog).findByText('Senha incorreta')).toBeTruthy()
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('com a senha certa, exclui e volta ao modo anônimo', async () => {
    mocks.deleteAccountAction.mockResolvedValue({ ok: true, data: undefined })
    const { user, dialog } = await open()
    await user.type(
      within(dialog).getByLabelText('Confirme com a sua senha'),
      'certa',
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Excluir de vez' }),
    )
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/cursos'))
    expect(mocks.deleteAccountAction).toHaveBeenCalledWith('certa')
  })
})

describe('UsersManager', () => {
  const person = (overrides: Partial<AdminUser>): AdminUser => ({
    id: 'u1',
    name: 'Ana Souza',
    email: 'ana@alu.ufc.br',
    status: 'ACTIVE',
    roles: [],
    evaluationCount: 0,
    createdAt: '2026-11-01T12:00:00.000Z',
    ...overrides,
  })

  beforeEach(() => {
    mocks.listUsersAction.mockResolvedValue({
      ok: true,
      data: {
        items: [
          person({ id: 'me', name: 'Carla Admin', roles: ['ADMIN'] }),
          person({ id: 'u1', evaluationCount: 2 }),
          person({ id: 'u2', name: 'Bruno Lima', status: 'SUSPENDED' }),
        ],
        nextCursor: null,
      },
    })
  })

  const card = async (name: string) =>
    (await screen.findByText(name)).closest('li') as HTMLElement

  it('lista as contas com situação, papéis e avaliações', async () => {
    wrap(<UsersManager currentUserId="me" />)
    const admin = await card('Carla Admin')
    expect(within(admin).getByText('Você')).toBeTruthy()
    expect(within(admin).getByText('Admin')).toBeTruthy()
    // Nem a própria conta nem outro admin podem ser suspensos
    expect(
      within(admin).queryByRole('button', { name: /Suspender/ }),
    ).toBeNull()
    const ana = await card('Ana Souza')
    expect(within(ana).getByText(/2 avaliações/)).toBeTruthy()
    const bruno = await card('Bruno Lima')
    expect(within(bruno).getByText('Suspensa')).toBeTruthy()
    expect(within(bruno).getByRole('button', { name: /Reativar/ })).toBeTruthy()
    expect(
      within(bruno).queryByRole('button', { name: /Descartar/ }),
    ).toBeNull()
  })

  it('busca e filtra pela situação', async () => {
    const user = userEvent.setup()
    wrap(<UsersManager currentUserId="me" />)
    await card('Ana Souza')
    await user.type(screen.getByLabelText('Buscar por nome ou e-mail'), ' ana ')
    await user.click(screen.getByRole('button', { name: /Buscar/ }))
    await waitFor(() =>
      expect(mocks.listUsersAction).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'ana' }),
      ),
    )
    await user.click(screen.getByRole('button', { name: 'Suspensas' }))
    await waitFor(() =>
      expect(mocks.listUsersAction).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'ana', status: 'SUSPENDED' }),
      ),
    )
  })

  it('suspender pede confirmação e recarrega a lista', async () => {
    const user = userEvent.setup()
    mocks.suspendUserAction.mockResolvedValue({ ok: true, data: undefined })
    wrap(<UsersManager currentUserId="me" />)
    const ana = await card('Ana Souza')
    await user.click(within(ana).getByRole('button', { name: /Suspender/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Suspender a conta?')).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: 'Suspender' }))
    await waitFor(() =>
      expect(mocks.suspendUserAction).toHaveBeenCalledWith('u1'),
    )
    await waitFor(() => expect(mocks.listUsersAction).toHaveBeenCalledTimes(2))
  })

  it('descartar avaliações também pede confirmação', async () => {
    const user = userEvent.setup()
    mocks.discardEvaluationsAction.mockResolvedValue({
      ok: true,
      data: { discarded: 2 },
    })
    wrap(<UsersManager currentUserId="me" />)
    const ana = await card('Ana Souza')
    await user.click(within(ana).getByRole('button', { name: /Descartar/ }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Descartar' }))
    await waitFor(() =>
      expect(mocks.discardEvaluationsAction).toHaveBeenCalledWith('u1'),
    )
  })

  it('o link de senha aparece para copiar', async () => {
    const user = userEvent.setup()
    mocks.passwordResetLinkAction.mockResolvedValue({
      ok: true,
      data: {
        url: 'http://localhost:3000/redefinir-senha?token=abc',
        expiresAt: '2026-11-08T12:00:00.000Z',
      },
    })
    wrap(<UsersManager currentUserId="me" />)
    const ana = await card('Ana Souza')
    await user.click(within(ana).getByRole('button', { name: /Link de senha/ }))
    const dialog = await screen.findByRole('dialog')
    expect(
      (within(dialog).getByLabelText('Link') as HTMLInputElement).value,
    ).toBe('http://localhost:3000/redefinir-senha?token=abc')
  })
})
