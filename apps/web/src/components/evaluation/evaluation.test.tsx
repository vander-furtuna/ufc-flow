// @vitest-environment jsdom
import type {
  MyEvaluation,
  SubjectEvaluationSummary,
} from '@ufc-flow/contracts'
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
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ saveEvaluationAction: vi.fn() }))
vi.mock('@/lib/evaluation/evaluation-actions', () => ({
  saveEvaluationAction: mocks.saveEvaluationAction,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { EvaluationForm } from './evaluation-form'
import { EvaluationSummary } from './evaluation-summary'

const C1 = '00000000-0000-4000-8000-000000000001'
const C2 = '00000000-0000-4000-8000-000000000002'

const criterion = (id: string, label: string, mean: number | null) => ({
  id,
  key: label.toLowerCase(),
  label,
  description: null,
  lowLabel: 'pouca',
  highLabel: 'muita',
  mean,
  count: mean === null ? null : 6,
  distribution: mean === null ? null : [0, 1, 1, 2, 2],
})

const summary = (enough: boolean): SubjectEvaluationSummary => ({
  subject: { code: 'ECO0005', name: 'Introdução à Engenharia' },
  enough,
  total: enough ? 34 : null,
  criteria: [
    criterion(C1, 'Formação', enough ? 4.4 : null),
    criterion(C2, 'Carga', enough ? 3.2 : null),
  ],
})

const wrap = (node: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      {node}
    </QueryClientProvider>,
  )

afterEach(cleanup)

describe('EvaluationSummary', () => {
  it('médias com vírgula, total e a distribuição ao expandir', async () => {
    const user = userEvent.setup()
    wrap(<EvaluationSummary summary={summary(true)} />)
    expect(screen.getByText('34 avaliações anônimas')).toBeTruthy()
    expect(screen.getByText('4,4')).toBeTruthy()
    const toggle = screen.getByRole('button', { name: /Formação/ })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    await user.click(toggle)
    expect(
      screen.getByRole('list', { name: 'Distribuição das notas de Formação' }),
    ).toBeTruthy()
  })

  it('abaixo do mínimo, nenhum número', () => {
    wrap(<EvaluationSummary summary={summary(false)} />)
    expect(
      screen.getByText(/As médias aparecem a partir de 5 avaliações/),
    ).toBeTruthy()
    expect(screen.queryByText(/avaliações anônimas/)).toBeNull()
  })
})

describe('EvaluationForm', () => {
  const mine = (overrides: Partial<MyEvaluation> = {}): MyEvaluation => ({
    eligibility: {
      eligible: true,
      status: 'APROVADO',
      term: '2023.1',
      requiresInstitutionalEmail: false,
    },
    scores: [],
    updatedAt: null,
    ...overrides,
  })

  it('conta as notas, só envia completo e manda uma por critério', async () => {
    mocks.saveEvaluationAction.mockResolvedValue({ ok: true, data: mine() })
    const user = userEvent.setup()
    wrap(
      <EvaluationForm
        code="ECO0005"
        criteria={summary(true).criteria}
        mine={mine()}
      />,
    )
    expect(
      screen.getByText(/Liberada pelo seu histórico: Aprovado em 2023.1/),
    ).toBeTruthy()
    const submit = screen.getByRole('button', {
      name: 'Enviar avaliação (0 de 2)',
    })
    expect(submit.hasAttribute('disabled')).toBe(true)
    const [formacao, carga] = screen.getAllByRole('group')
    await user.click(within(formacao!).getByRole('radio', { name: /^5/ }))
    expect(
      screen.getByRole('button', { name: 'Enviar avaliação (1 de 2)' }),
    ).toBeTruthy()
    await user.click(
      carga!.querySelector('input[value="2"]') as HTMLInputElement,
    )
    await user.click(screen.getByRole('button', { name: 'Enviar avaliação' }))
    await waitFor(() =>
      expect(mocks.saveEvaluationAction).toHaveBeenCalledWith('ECO0005', {
        scores: [
          { criterionId: C1, score: 5 },
          { criterionId: C2, score: 2 },
        ],
      }),
    )
  })

  it('já avaliada, vem preenchida para atualizar', () => {
    wrap(
      <EvaluationForm
        code="ECO0005"
        criteria={summary(true).criteria}
        mine={mine({
          scores: [
            { criterionId: C1, score: 4 },
            { criterionId: C2, score: 3 },
          ],
          updatedAt: '2026-11-04T12:00:00.000Z',
        })}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Atualizar avaliação' }),
    ).toBeTruthy()
  })

  it('sem histórico, diz como liberar', () => {
    wrap(
      <EvaluationForm
        code="ECO0005"
        criteria={summary(true).criteria}
        mine={mine({
          eligibility: {
            eligible: false,
            status: null,
            term: null,
            requiresInstitutionalEmail: false,
          },
        })}
      />,
    )
    expect(
      screen.getByText(/Registre a situação no seu histórico/),
    ).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: 'Abrir o histórico' })
        .getAttribute('href'),
    ).toBe('/minha-area/historico')
  })
})
