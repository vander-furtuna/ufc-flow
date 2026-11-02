// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ImportCandidate } from '@/lib/planning/import-candidates'
import type { ImportPreview } from '@/lib/planning/schedule-actions'
import type { ScheduledClass } from '@/types/class'

import { ScheduleImportDialog } from './schedule-import-dialog'

afterEach(cleanup)

const cls = (code: string): ScheduledClass => ({
  id: code,
  term: '2026.2',
  sectionId: '01',
  instructors: [],
  reservedSeats: 0,
  schedule: [],
  validity: { startDate: '', endDate: '' },
  code,
  name: code,
  color: 'blue',
})

const option = (courseSlug: string, courseName: string, matches: number) => ({
  courseSlug,
  curriculumSlug: '2006-2',
  courseName,
  matches,
})

const candidate = (
  id: string,
  name: string,
  term: string,
  codes: string[],
  options = [option('eng-comp', 'Engenharia de Computação', codes.length)],
): ImportCandidate => ({
  schedule: {
    id,
    courseId: '2006.2',
    year: Number(term.slice(0, 4)),
    semester: Number(term.slice(5)),
    name,
    createdAt: 1,
    updatedAt: 1,
    classes: codes.map(cls),
  },
  term,
  options,
  ambiguous: options.length > 1,
})

const candidates = [
  candidate('a', 'Meu cronograma', '2026.2', ['ECO0001', 'ECO0002']),
  candidate(
    'b',
    'Plano B',
    '2026.2',
    ['ECO0003'],
    [
      option('eng-comp', 'Engenharia de Computação', 1),
      option('eng-eletrica', 'Engenharia Elétrica', 0),
    ],
  ),
  candidate('c', 'Agenda antiga', '2026.2', ['ECO0001', 'ECO0099']),
  candidate('d', 'Agenda 2025.2', '2025.2', ['ECO0001']),
]

const preview: ImportPreview = {
  '2026.2|eng-comp': {
    available: true,
    sections: ['ECO0001|01', 'ECO0002|01', 'ECO0003|01'],
  },
  '2026.2|eng-eletrica': { available: true, sections: [] },
  '2025.2|eng-comp': { available: false, sections: [] },
}

function setup(isMobile = false) {
  const onImport = vi.fn()
  const onDismiss = vi.fn()
  render(
    <ScheduleImportDialog
      open
      candidates={candidates}
      preview={preview}
      isMobile={isMobile}
      isImporting={false}
      onImport={onImport}
      onDismiss={onDismiss}
    />,
  )
  return { user: userEvent.setup(), onImport, onDismiss }
}

const row = (name: string) => screen.getByText(name).closest('li')!

describe('ScheduleImportDialog', () => {
  it('mostra cada estado e marca só as agendas que entram inteiras', () => {
    setup()
    expect(
      screen.getByRole('heading', {
        name: 'Encontramos 4 agendas neste navegador',
      }),
    ).toBeTruthy()
    expect(
      within(row('Meu cronograma')).getByText(
        'Engenharia de Computação · todas as turmas encontradas',
      ),
    ).toBeTruthy()
    expect(
      within(row('Plano B')).getByRole('combobox', {
        name: 'Curso da agenda Plano B',
      }),
    ).toBeTruthy()
    expect(
      within(row('Agenda antiga')).getByText(
        '1 turma não existe mais no SIGAA e fica de fora',
      ),
    ).toBeTruthy()
    const old = within(row('Agenda 2025.2')).getByRole('checkbox')
    expect(old.hasAttribute('disabled')).toBe(true)
    expect(
      screen.getByRole('button', { name: 'Importar 2 agendas' }),
    ).toBeTruthy()
  })

  it('importa com o curso escolhido e o texto do botão acompanha a seleção', async () => {
    const { user, onImport } = setup()
    await user.click(within(row('Meu cronograma')).getByRole('checkbox'))
    await user.selectOptions(
      within(row('Plano B')).getByRole('combobox'),
      'Engenharia Elétrica (0 de 1)',
    )
    expect(
      within(row('Plano B')).getByText(
        '1 turma não existe mais no SIGAA e fica de fora',
      ),
    ).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Importar 1 agenda' }))
    expect(onImport).toHaveBeenCalledWith([
      {
        candidate: candidates[1],
        option: option('eng-eletrica', 'Engenharia Elétrica', 0),
      },
    ])
    await user.click(within(row('Plano B')).getByRole('checkbox'))
    expect(
      (
        screen.getByRole('button', {
          name: 'Selecione uma agenda',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
  })

  it('no celular vira folha inferior, e "Agora não" dispensa', async () => {
    const { user, onDismiss } = setup(true)
    expect(
      screen.getByRole('heading', { name: '4 agendas neste aparelho' }),
    ).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Agora não' }))
    expect(onDismiss).toHaveBeenCalled()
  })
})
