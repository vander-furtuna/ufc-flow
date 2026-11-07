// @vitest-environment jsdom
import type { Me } from '@ufc-flow/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  uploadFile: vi.fn(),
  setAvatarAction: vi.fn(),
  removeAvatarAction: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/cursos',
  useRouter: () => ({ refresh: vi.fn() }),
}))
vi.mock('@/lib/auth/actions', () => ({ signOutAction: vi.fn() }))
vi.mock('@/lib/files/avatar-actions', () => ({
  setAvatarAction: mocks.setAvatarAction,
  removeAvatarAction: mocks.removeAvatarAction,
}))
vi.mock('@/lib/files/upload', () => ({
  uploadFile: mocks.uploadFile,
  fileUrl: (id: string) => `/arquivos/${id}`,
}))
vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: vi.fn() },
}))

import { UserMenu } from './user-menu'

const FILE_ID = '0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10'

const me = (avatarFileId: string | null): Me => ({
  id: '1b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10',
  name: 'Ana Souza',
  email: 'ana@ufc.br',
  status: 'ACTIVE',
  roles: [],
  moderatedCourses: [],
  avatarFileId,
  pendingConsents: [],
  createdAt: '2026-11-01T12:00:00.000Z',
})

function setup(avatarFileId: string | null = null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ user: me(avatarFileId) })),
  )
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const { container } = render(
    <QueryClientProvider client={client}>
      <UserMenu />
    </QueryClientProvider>,
  )
  return { user: userEvent.setup(), container }
}

beforeEach(() => {
  vi.clearAllMocks()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const photoInput = (container: HTMLElement) =>
  container.querySelector('input[type="file"]') as HTMLInputElement

describe('UserMenu e foto de perfil', () => {
  it('sem foto mostra as iniciais; adicionar envia e liga o arquivo', async () => {
    const { user, container } = setup()
    const trigger = await screen.findByRole('button', {
      name: 'Conta de Ana Souza',
    })
    expect(trigger.textContent).toBe('AS')
    mocks.uploadFile.mockResolvedValue({ ok: true, data: { id: FILE_ID } })
    mocks.setAvatarAction.mockResolvedValue({ ok: true, data: me(FILE_ID) })

    const photo = new File(['jpeg'], 'eu.jpg', { type: 'image/jpeg' })
    await user.upload(photoInput(container), photo)
    await waitFor(() =>
      expect(mocks.setAvatarAction).toHaveBeenCalledWith(FILE_ID),
    )
    expect(mocks.uploadFile).toHaveBeenCalledWith(photo, 'AVATAR')
    await waitFor(() =>
      expect(trigger.querySelector('img')?.getAttribute('src')).toBe(
        `/arquivos/${FILE_ID}`,
      ),
    )
  })

  it('foto acima de 5 MB nem é enviada; erro da API aparece', async () => {
    const { container } = setup()
    await screen.findByRole('button', { name: 'Conta de Ana Souza' })
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'grande.jpg', {
      type: 'image/jpeg',
    })
    await userEvent.setup().upload(photoInput(container), big)
    expect(mocks.uploadFile).not.toHaveBeenCalled()
    expect(mocks.toastError).toHaveBeenCalledWith('Foto grande demais', {
      description: 'Envie até 5 MB.',
    })

    mocks.uploadFile.mockResolvedValue({
      ok: false,
      problem: {
        code: 'FILE_TYPE_NOT_ALLOWED',
        detail: 'Tipo de arquivo não aceito aqui',
      },
    })
    await userEvent
      .setup()
      .upload(
        photoInput(container),
        new File(['x'], 'eu.jpg', { type: 'image/jpeg' }),
      )
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        'Não foi possível trocar a foto',
        { description: 'Tipo de arquivo não aceito aqui' },
      ),
    )
    expect(mocks.setAvatarAction).not.toHaveBeenCalled()
  })

  it('com foto: remover volta para as iniciais', async () => {
    const { user } = setup(FILE_ID)
    const trigger = await screen.findByRole('button', {
      name: 'Conta de Ana Souza',
    })
    expect(trigger.querySelector('img')).not.toBeNull()
    mocks.removeAvatarAction.mockResolvedValue({ ok: true, data: me(null) })
    await user.click(trigger)
    expect(await screen.findByText('Alterar foto')).toBeTruthy()
    await user.click(await screen.findByText('Remover foto'))
    await waitFor(() => expect(trigger.textContent).toBe('AS'))
  })
})
