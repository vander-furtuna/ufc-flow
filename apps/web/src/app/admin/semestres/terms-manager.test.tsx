// @vitest-environment jsdom
import type { AcademicTerm, CourseDetail } from '@ufc-flow/contracts'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

const actions = vi.hoisted(() => ({
  collectSectionsAction: vi.fn(),
  createTermAction: vi.fn(),
  deleteTermAction: vi.fn(),
  makeCurrentTermAction: vi.fn(),
  updateTermAction: vi.fn(),
}))
vi.mock('@/lib/catalog/admin-actions', () => actions)
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { TermsManager } from './terms-manager'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const term = (code: string, isCurrent = false): AcademicTerm => ({
  id: `id-${code}`,
  code,
  startsAt: `${code.slice(0, 4)}-08-10`,
  endsAt: `${code.slice(0, 4)}-12-11`,
  isCurrent,
})

const course = {
  id: 'c1',
  slug: 'engenharia-de-computacao',
  name: 'Engenharia de Computação',
  sigaaId: '657484',
  isActive: true,
} as CourseDetail

function setup(isAdmin = true) {
  render(
    <TermsManager
      initialTerms={[term('2027.1'), term('2026.2', true)]}
      courses={[course]}
      isAdmin={isAdmin}
    />,
  )
  return userEvent.setup()
}

const row = (code: string) => screen.getByText(code).closest('li')!

describe('TermsManager', () => {
  it('marca outro semestre como vigente', async () => {
    const user = setup()
    expect(within(row('2026.2')).getByText('Vigente')).toBeTruthy()
    actions.makeCurrentTermAction.mockResolvedValue({
      ok: true,
      data: term('2027.1', true),
    })
    await user.click(
      within(row('2027.1')).getByRole('button', {
        name: 'Marcar como vigente',
      }),
    )
    expect(actions.makeCurrentTermAction).toHaveBeenCalledWith('2027.1')
    expect(within(row('2027.1')).getByText('Vigente')).toBeTruthy()
    expect(within(row('2026.2')).queryByText('Vigente')).toBeNull()
  })

  it('cadastra um semestre pelo diálogo', async () => {
    const user = setup()
    actions.createTermAction.mockResolvedValue({
      ok: true,
      data: term('2027.2'),
    })
    await user.click(screen.getByRole('button', { name: '+ Novo semestre' }))
    fireEvent.change(screen.getByLabelText('Semestre'), {
      target: { value: '2027.2' },
    })
    fireEvent.change(screen.getByLabelText('Início das aulas'), {
      target: { value: '2027-08-10' },
    })
    fireEvent.change(screen.getByLabelText('Fim das aulas'), {
      target: { value: '2027-12-11' },
    })
    await user.click(screen.getByRole('button', { name: 'Cadastrar semestre' }))
    expect(actions.createTermAction).toHaveBeenCalledWith({
      code: '2027.2',
      startsAt: '2027-08-10',
      endsAt: '2027-12-11',
    })
    expect(screen.getAllByRole('listitem')[0]!.textContent).toContain('2027.2')
  })

  it('coleta as turmas do curso no vigente e mostra o resultado', async () => {
    const user = setup(false)
    expect(screen.queryByRole('button', { name: '+ Novo semestre' })).toBeNull()
    actions.collectSectionsAction.mockResolvedValue({
      ok: true,
      data: { status: 'SUCCESS', sectionsSeen: 76, sectionsChanged: 3 },
    })
    await user.click(screen.getByRole('button', { name: 'Coletar agora' }))
    expect(actions.collectSectionsAction).toHaveBeenCalledWith(
      '2026.2',
      'engenharia-de-computacao',
    )
    expect(screen.getByText('76 turmas, 3 novas ou alteradas')).toBeTruthy()

    actions.collectSectionsAction.mockResolvedValue({
      ok: true,
      data: { status: 'FAILED', error: 'SIGAA respondeu 503' },
    })
    await user.click(screen.getByRole('button', { name: 'Coletar agora' }))
    expect(screen.getByText('Falhou: SIGAA respondeu 503')).toBeTruthy()
  })
})
