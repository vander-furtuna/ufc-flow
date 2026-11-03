// @vitest-environment jsdom
import type { ActivityCategoryView } from '@ufc-flow/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  saveActivityAction: vi.fn(),
  uploadFile: vi.fn(),
}))

vi.mock('@/lib/academic-record/activity-actions', () => ({
  saveActivityAction: mocks.saveActivityAction,
  deleteActivityAction: vi.fn(),
  listActivitiesAction: vi.fn(),
}))
vi.mock('@/lib/academic-record/academic-actions', () => ({}))
vi.mock('@/lib/files/upload', () => ({
  uploadFile: mocks.uploadFile,
  fileUrl: (id: string) => `/arquivos/${id}`,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { ActivityDialog } from './activity-dialog'

const ENROLLMENT = '0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10'
const FILE_ID = '1b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10'
const MONITORIA = '2b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10'

const categories: ActivityCategoryView[] = [
  {
    id: MONITORIA,
    kind: 'COMPLEMENTARY',
    name: 'Monitoria',
    maxHours: 60,
    position: 0,
  },
  {
    id: '3b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10',
    kind: 'EXTENSION',
    name: 'Projetos de extensão',
    maxHours: null,
    position: 1,
  },
]

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <ActivityDialog
        open
        onOpenChange={vi.fn()}
        enrollmentId={ENROLLMENT}
        categories={categories}
        activity={null}
      />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.saveActivityAction.mockResolvedValue({ ok: true, data: {} })
  mocks.uploadFile.mockResolvedValue({ ok: true, data: { id: FILE_ID } })
})
afterEach(cleanup)

const optionTexts = () =>
  [...screen.getByLabelText('Categoria').querySelectorAll('option')].map(
    (option) => option.textContent,
  )

describe('Lançar atividade', () => {
  it('filtra as categorias pelo tipo e envia o certificado antes de salvar', async () => {
    const user = setup()
    expect(optionTexts()).toEqual(['Sem categoria', 'Monitoria (até 60 h)'])
    await user.click(screen.getByRole('button', { name: 'Extensão' }))
    expect(optionTexts()).toEqual(['Sem categoria', 'Projetos de extensão'])
    await user.click(screen.getByRole('button', { name: 'Complementar' }))

    await user.selectOptions(screen.getByLabelText('Categoria'), MONITORIA)
    await user.type(screen.getByLabelText('Título'), 'Monitoria de Cálculo I')
    await user.type(screen.getByLabelText('Horas'), '80')
    await user.type(screen.getByLabelText('Início'), '2025-03-01')
    const pdf = new File(['%PDF-1.4'], 'certificado.pdf', {
      type: 'application/pdf',
    })
    await user.upload(screen.getByLabelText(/Certificado/), pdf)
    await user.click(screen.getByRole('button', { name: 'Lançar atividade' }))

    await waitFor(() =>
      expect(mocks.saveActivityAction).toHaveBeenCalledWith(
        { enrollmentId: ENROLLMENT },
        {
          kind: 'COMPLEMENTARY',
          categoryId: MONITORIA,
          title: 'Monitoria de Cálculo I',
          institution: '',
          description: '',
          hours: 80,
          startedOn: '2025-03-01',
          endedOn: null,
          certificateFileId: FILE_ID,
        },
      ),
    )
    expect(mocks.uploadFile).toHaveBeenCalledWith(pdf, 'CERTIFICATE')
  })

  it('recusa certificado acima de 10 MB sem enviar', async () => {
    const user = setup()
    const big = new File(['x'], 'grande.pdf', { type: 'application/pdf' })
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 })
    await user.upload(screen.getByLabelText(/Certificado/), big)
    expect(screen.getByRole('alert').textContent).toBe(
      'O certificado pode ter até 10 MB.',
    )
    expect(mocks.uploadFile).not.toHaveBeenCalled()
  })
})
