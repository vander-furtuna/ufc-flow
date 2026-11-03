// @vitest-environment jsdom
import type { EnrollmentView, SubjectRecordView } from '@ufc-flow/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  addRecordAction: vi.fn(),
  findSubjectAction: vi.fn(),
}))

vi.mock('@/lib/academic-record/academic-actions', () => ({
  addRecordAction: mocks.addRecordAction,
  findSubjectAction: mocks.findSubjectAction,
  listEnrollmentsAction: vi.fn(async () => ({ ok: true, data: [] })),
  listRecordsAction: vi.fn(async () => ({ ok: true, data: [] })),
}))
vi.mock('@/lib/academic-record/activity-actions', () => ({}))
vi.mock('@/contexts/course', () => ({
  useCourse: () => ({
    courses: [
      {
        slug: 'eng',
        curriculumStructures: [
          {
            slug: '2006-2',
            subjects: [
              {
                code: 'ECO0021',
                name: 'Eletrônica Analógica',
                nature: 'OBRIGATÓRIA',
              },
              {
                code: 'ECO0018',
                name: 'Estruturas de Dados',
                nature: 'OBRIGATÓRIA',
              },
            ],
          },
        ],
      },
    ],
  }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { RecordForm } from './record-form'

const enrollment: EnrollmentView = {
  id: '0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10',
  course: {
    id: '1b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10',
    slug: 'eng',
    name: 'Engenharia',
  },
  curriculum: {
    id: '2b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10',
    slug: '2006-2',
    code: '2006.2',
  },
  registrationNumber: '512345',
  status: 'ACTIVE',
  isCurrent: true,
  entryTerm: '2025.1',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const failed: SubjectRecordView = {
  id: '3b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10',
  subjectCode: 'ECO0021',
  subjectName: 'Eletrônica Analógica',
  workloadHours: 96,
  nature: 'MANDATORY',
  term: '2025.2',
  status: 'REPROVADO',
  grade: 4.1,
  sourceRecordId: null,
  originNote: null,
  createdAt: '2026-01-01T00:00:00.000Z',
}

function setup() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ user: null })),
  )
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <RecordForm
        enrollment={enrollment}
        records={[failed]}
        currentTerm="2026.1"
      />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.addRecordAction.mockResolvedValue({ ok: true, data: failed })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Registrar disciplina', () => {
  it('mostra a última tentativa e muda os campos com o semestre e a situação', async () => {
    const user = setup()
    await user.type(screen.getByLabelText('Disciplina'), 'eletronica')
    await user.click(
      screen.getByRole('button', { name: /Eletrônica Analógica/ }),
    )
    expect(
      screen.getByText(/última tentativa: Reprovado em 2025.2/),
    ).toBeTruthy()

    // CURSANDO é o padrão no vigente e não tem nota
    expect(
      screen
        .getByRole('button', { name: 'Cursando' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(screen.queryByLabelText(/Nota final/)).toBeNull()

    // Semestre passado: CURSANDO sai e a situação vira Aprovado
    await user.selectOptions(screen.getByLabelText('Semestre'), '2025.2')
    expect(
      (screen.getByRole('button', { name: 'Cursando' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Aprovado' })
        .getAttribute('aria-pressed'),
    ).toBe('true')

    await user.type(screen.getByLabelText(/Nota final/), '8,5')
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }))
    await waitFor(() =>
      expect(mocks.addRecordAction).toHaveBeenCalledWith(enrollment.id, {
        subjectCode: 'ECO0021',
        term: '2025.2',
        status: 'APROVADO',
        grade: 8.5,
        sourceRecordId: null,
        originNote: null,
      }),
    )
  })

  it('busca disciplina fora da EC e confere a nota antes de enviar', async () => {
    mocks.findSubjectAction.mockResolvedValue({
      ok: true,
      data: { code: 'LIV0001', name: 'LIBRAS' },
    })
    const user = setup()
    await user.type(screen.getByLabelText('Disciplina'), 'liv0001')
    await user.click(
      screen.getByRole('button', {
        name: 'Buscar LIV0001 no catálogo (fora da EC)',
      }),
    )
    expect(
      await screen.findByText(/fora da EC, conta como optativa livre/),
    ).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Aproveitada' }))
    expect(screen.getByLabelText('Origem do aproveitamento')).toBeTruthy()
    await user.type(screen.getByLabelText(/Nota final/), '11')
    await user.click(screen.getByRole('button', { name: 'Salvar registro' }))
    expect(screen.getByRole('alert').textContent).toBe('A nota vai de 0 a 10.')
    expect(mocks.addRecordAction).not.toHaveBeenCalled()
  })
})
