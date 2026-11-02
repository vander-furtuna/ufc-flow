// @vitest-environment jsdom
import type { NotificationView } from '@ufc-flow/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  session: {
    data: null as null | {
      id: string
      roles: string[]
      moderatedCourses: unknown[]
    },
    isPending: false,
  },
  isMobile: false,
  listNotificationsAction: vi.fn(),
  unreadCountAction: vi.fn(),
  markNotificationsReadAction: vi.fn(),
  getNotificationPreferencesAction: vi.fn(),
  saveNotificationPreferencesAction: vi.fn(),
}))

vi.mock('@/lib/auth/use-session', () => ({
  useSession: () => mocks.session,
}))
vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: () => mocks.isMobile,
}))
vi.mock('@/lib/notifications/notification-actions', () => ({
  listNotificationsAction: mocks.listNotificationsAction,
  unreadCountAction: mocks.unreadCountAction,
  markNotificationsReadAction: mocks.markNotificationsReadAction,
  getNotificationPreferencesAction: mocks.getNotificationPreferencesAction,
  saveNotificationPreferencesAction: mocks.saveNotificationPreferencesAction,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { NotificationBell } from './notification-bell'

const AT = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

const changed: NotificationView = {
  id: '0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10',
  type: 'SCHEDULE_SECTION_CHANGED',
  readAt: null,
  createdAt: AT,
  updatedAt: AT,
  data: {
    sectionId: '5a9fd2b4-9eb2-40bc-abf3-ad9c7f32918e',
    subjectCode: 'SBL0082',
    subjectName: 'MICROPROCESSADORES',
    sectionCode: '01',
    term: '2026.2',
    courseSlug: 'eng-comp',
    curriculumSlug: '2006-2',
    scheduleNames: ['Meu cronograma'],
  },
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <NotificationBell />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.session.data = { id: 'u1', roles: [], moderatedCourses: [] }
  mocks.isMobile = false
  mocks.unreadCountAction.mockResolvedValue({ ok: true, data: { count: 1 } })
  mocks.listNotificationsAction.mockResolvedValue({
    ok: true,
    data: { items: [changed], nextCursor: null },
  })
  mocks.markNotificationsReadAction.mockResolvedValue({
    ok: true,
    data: undefined,
  })
})
afterEach(cleanup)

describe('NotificationBell', () => {
  it('não aparece no modo anônimo', () => {
    mocks.session.data = null
    setup()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('mostra o contador e o painel com marcar todas como lidas', async () => {
    const user = setup()
    const bell = await screen.findByRole('button', {
      name: 'Notificações, 1 não lida',
    })
    await user.click(bell)
    const panel = await screen.findByRole('dialog')
    expect(
      await within(panel).findByText('Microprocessadores · turma 01'),
    ).toBeTruthy()
    expect(within(panel).getByText('Agenda · há 2 h')).toBeTruthy()
    expect(
      within(panel)
        .getByRole('link', { name: /Microprocessadores/ })
        .getAttribute('href'),
    ).toBe('/eng-comp/2006-2/agenda')
    await user.click(
      within(panel).getByRole('button', { name: 'Marcar todas como lidas' }),
    )
    expect(mocks.markNotificationsReadAction).toHaveBeenCalledWith({
      all: true,
    })
    // Depois de marcar, o contador é relido
    await waitFor(() =>
      expect(mocks.unreadCountAction.mock.calls.length).toBeGreaterThan(1),
    )
    expect(
      within(panel)
        .getByRole('link', { name: 'Ver todas' })
        .getAttribute('href'),
    ).toBe('/notificacoes')
  })

  it('no celular leva para a página de notificações', async () => {
    mocks.isMobile = true
    setup()
    const link = await screen.findByRole('link', {
      name: 'Notificações, 1 não lida',
    })
    expect(link.getAttribute('href')).toBe('/notificacoes')
  })

  it('preferências mostram só o que a pessoa recebe e salvam os silenciados', async () => {
    mocks.getNotificationPreferencesAction.mockResolvedValue({
      ok: true,
      data: { muted: [] },
    })
    mocks.saveNotificationPreferencesAction.mockResolvedValue({
      ok: true,
      data: { muted: ['SCHEDULE_SECTION_REMOVED'] },
    })
    const user = setup()
    await user.click(
      await screen.findByRole('button', { name: /Notificações/ }),
    )
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Preferências',
      }),
    )
    const dialog = await screen.findByRole('dialog', {
      name: 'Preferências de notificação',
    })
    const removed = await within(dialog).findByRole('checkbox', {
      name: 'Turma da minha agenda saiu do SIGAA',
    })
    // Quem não é admin nem modera não vê coleta, importações nem pedidos
    expect(within(dialog).queryByText('Falha na coleta de turmas')).toBeNull()
    expect(
      within(dialog).queryByText('Nova solicitação de moderação'),
    ).toBeNull()
    await user.click(removed)
    await user.click(
      within(dialog).getByRole('button', { name: 'Salvar preferências' }),
    )
    expect(mocks.saveNotificationPreferencesAction).toHaveBeenCalledWith({
      muted: ['SCHEDULE_SECTION_REMOVED'],
    })
  })
})
