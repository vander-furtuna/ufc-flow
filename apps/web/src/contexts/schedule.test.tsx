// @vitest-environment jsdom
import type { ScheduleView } from '@ufc-flow/contracts'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { useLayoutEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ClassSection } from '@/types/class'

// Objetos estáveis, como nos contextos de verdade
const mocks = vi.hoisted(() => ({
  session: { data: { id: 'u1' }, isPending: false },
  course: {
    courses: [],
    selectedCourse: { id: '657484', slug: 'eng-comp', name: 'Eng. Comp.' },
    selectedCurriculum: { id: '2006.2', slug: '2006-2', subjects: [] },
  },
  classes: { currentYear: 2026, currentSemester: 2, currentClassGroup: null },
  listSchedulesAction: vi.fn(),
  saveScheduleAction: vi.fn(),
  deleteScheduleAction: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/lib/planning/schedule-actions', () => ({
  listSchedulesAction: mocks.listSchedulesAction,
  saveScheduleAction: mocks.saveScheduleAction,
  deleteScheduleAction: mocks.deleteScheduleAction,
}))
vi.mock('@/lib/auth/use-session', () => ({
  useSession: () => mocks.session,
}))
vi.mock('@/lib/indexeddb', () => ({
  getAllSchedules: vi.fn(async () => []),
  saveSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
  getCompletedSubjects: vi.fn(async () => []),
  saveCompletedSubjects: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, info: vi.fn(), warning: vi.fn() },
}))
vi.mock('./course', () => ({
  useCourse: () => mocks.course,
}))
vi.mock('./class', () => ({
  useClass: () => mocks.classes,
}))

import { ScheduleProvider, useSchedule } from './schedule'

const SECTION = '5a9fd2b4-9eb2-40bc-abf3-ad9c7f32918e'

const section: ClassSection = {
  id: SECTION,
  term: '2026.2',
  sectionId: '01',
  instructors: [],
  reservedSeats: 10,
  schedule: [{ id: 's', day: 'SEG', startTime: '08:00', endTime: '10:00' }],
  validity: { startDate: '2026-08-10', endDate: '2026-12-11' },
  code: 'SBL0056',
  name: 'ÁLGEBRA LINEAR',
}

const view = (overrides: Partial<ScheduleView> = {}): ScheduleView => ({
  id: '0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10',
  courseSlug: 'eng-comp',
  curriculumSlug: '2006-2',
  term: '2026.2',
  name: 'Plano A',
  position: 0,
  createdAt: '2026-11-01T12:00:00.000Z',
  updatedAt: '2026-11-01T12:00:00.000Z',
  items: [],
  ...overrides,
})

// O contexto atual, para os testes chamarem as ações. Layout effect: roda no
// commit, antes de o waitFor ver o texto novo; com useEffect, o teste às vezes
// chamava a ação de um contexto antigo (sem a agenda) e ela era ignorada
const current = { api: null as unknown as ReturnType<typeof useSchedule> }

function Probe() {
  const api = useSchedule()
  useLayoutEffect(() => {
    current.api = api
  })
  return (
    <p data-testid="probe">
      {api.currentSchedule?.name}:{' '}
      {api.scheduleClasses
        .map((cls) => `${cls.code}${cls.changed ? '*' : ''}`)
        .join(',')}{' '}
      [{api.sync.mode}/{api.sync.status}]
    </p>
  )
}

const probe = () => screen.getByTestId('probe').textContent

beforeEach(() => {
  vi.clearAllMocks()
})
afterEach(cleanup)

describe('ScheduleProvider na conta', () => {
  it('sem agendas, a padrão só é gravada na primeira alteração', async () => {
    mocks.listSchedulesAction.mockResolvedValue({ ok: true, data: [] })
    render(
      <ScheduleProvider>
        <Probe />
      </ScheduleProvider>,
    )
    await waitFor(() => expect(probe()).toContain('Meu cronograma'))
    expect(mocks.listSchedulesAction).toHaveBeenCalledWith({
      course: 'eng-comp',
      curriculum: '2006-2',
      term: '2026.2',
    })
    expect(mocks.saveScheduleAction).not.toHaveBeenCalled()

    mocks.saveScheduleAction.mockImplementation(async (id: string) => ({
      ok: true,
      data: view({
        id,
        name: 'Meu cronograma',
        items: [
          {
            sectionId: SECTION,
            subjectCode: 'SBL0056',
            subjectName: 'ÁLGEBRA LINEAR',
            sectionCode: '01',
            color: 'red',
            instructors: [],
            slots: [{ weekday: 1, startTime: '08:00', endTime: '10:00' }],
            validFrom: null,
            validTo: null,
            addedAt: '2026-11-02T12:00:00.000Z',
            changed: false,
            removed: false,
          },
        ],
      }),
    }))
    act(() => current.api.addClassToSchedule(section))
    expect(probe()).toContain('SBL0056')
    await waitFor(() => expect(probe()).toContain('[account/idle]'))
    const [, input] = mocks.saveScheduleAction.mock.calls[0]!
    expect(input).toMatchObject({
      courseSlug: 'eng-comp',
      curriculumSlug: '2006-2',
      term: '2026.2',
      name: 'Meu cronograma',
      items: [{ sectionId: SECTION }],
    })
  })

  it('volta a agenda como era quando a API recusa', async () => {
    mocks.listSchedulesAction.mockResolvedValue({ ok: true, data: [view()] })
    mocks.saveScheduleAction.mockResolvedValue({
      ok: false,
      problem: {
        code: 'SCHEDULE_SECTION_NOT_FOUND',
        detail: 'x',
        status: 400,
      },
    })
    render(
      <ScheduleProvider>
        <Probe />
      </ScheduleProvider>,
    )
    await waitFor(() => expect(probe()).toContain('Plano A'))
    act(() => current.api.addClassToSchedule(section))
    await waitFor(() => expect(probe()).toContain('[account/error]'))
    expect(probe()).not.toContain('SBL0056')
    expect(mocks.toastError).toHaveBeenCalledWith(
      'Não foi possível salvar na sua conta',
      expect.objectContaining({
        description: expect.stringContaining('ainda não foram coletadas'),
      }),
    )
  })

  it('dispensar o aviso grava a turma com acknowledgeChange', async () => {
    const changed = {
      sectionId: SECTION,
      subjectCode: 'SBL0056',
      subjectName: 'ÁLGEBRA LINEAR',
      sectionCode: '01',
      color: 'red' as const,
      instructors: [],
      slots: [{ weekday: 1 as const, startTime: '10:00', endTime: '12:00' }],
      validFrom: null,
      validTo: null,
      addedAt: '2026-11-02T12:00:00.000Z',
      changed: true,
      removed: false,
    }
    mocks.listSchedulesAction.mockResolvedValue({
      ok: true,
      data: [view({ items: [changed] })],
    })
    mocks.saveScheduleAction.mockResolvedValue({
      ok: true,
      data: view({ items: [{ ...changed, changed: false }] }),
    })
    render(
      <ScheduleProvider>
        <Probe />
      </ScheduleProvider>,
    )
    await waitFor(() => expect(probe()).toContain('SBL0056*'))
    act(() => current.api.acknowledgeChange(current.api.scheduleClasses[0]!))
    await waitFor(() => expect(mocks.saveScheduleAction).toHaveBeenCalled())
    await waitFor(() => expect(probe()).toContain('[account/idle]'))
    expect(probe()).not.toContain('SBL0056*')
    expect(mocks.saveScheduleAction.mock.calls[0]![1].items).toEqual([
      { sectionId: SECTION, color: 'red', acknowledgeChange: true },
    ])
  })
})
