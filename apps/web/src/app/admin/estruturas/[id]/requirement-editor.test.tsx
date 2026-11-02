// @vitest-environment jsdom
import type { RequirementExpr } from '@ufc-flow/academic-core'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RequirementEditor } from './requirement-editor'

afterEach(cleanup)

const subjects = [
  { code: 'SBL0084', name: 'Cálculo Numérico' },
  { code: 'ECO0018', name: 'Estruturas de Dados' },
]

const example: RequirementExpr = {
  kind: 'and',
  items: [
    { kind: 'subject', code: 'SBL0084' },
    {
      kind: 'or',
      items: [
        { kind: 'subject', code: 'ECO0018' },
        { kind: 'subject', code: 'CEC0022' },
      ],
    },
  ],
}

function setup(value: RequirementExpr | null = example) {
  const onChange = vi.fn()
  render(
    <RequirementEditor
      label="Pré-requisitos"
      value={value}
      subjects={subjects}
      onChange={onChange}
    />,
  )
  return { user: userEvent.setup(), onChange }
}

const preview = () => screen.getByTestId('requirement-preview').textContent

describe('RequirementEditor', () => {
  it('mostra grupos, nomes e a expressão em texto', () => {
    setup()
    expect(preview()).toBe('SBL0084 E ( ECO0018 OU CEC0022 )')
    const [first] = screen.getAllByRole('group')
    expect(within(first!).getByText('Cálculo Numérico')).toBeTruthy()
    expect(screen.getByText('fora desta estrutura')).toBeTruthy()
    const groups = screen.getAllByRole('group')
    expect(groups).toHaveLength(2)
    expect(
      within(groups[0]!)
        .getAllByRole('button', { name: 'TODAS (E)' })[0]!
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('troca o tipo do grupo', async () => {
    const { user, onChange } = setup()
    const [root] = screen.getAllByRole('group')
    await user.click(
      within(root!).getAllByRole('button', { name: 'QUALQUER (OU)' })[0]!,
    )
    expect(preview()).toBe('SBL0084 OU ECO0018 OU CEC0022')
    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'or',
      items: [
        { kind: 'subject', code: 'SBL0084' },
        { kind: 'subject', code: 'ECO0018' },
        { kind: 'subject', code: 'CEC0022' },
      ],
    })
  })

  it('acrescenta e tira disciplinas', async () => {
    const { user, onChange } = setup()
    await user.click(screen.getByRole('button', { name: 'Tirar CEC0022' }))
    expect(preview()).toBe('SBL0084 E ECO0018')

    const [root] = screen.getAllByRole('group')
    await user.click(
      within(root!).getAllByRole('button', { name: '+ Disciplina' }).at(-1)!,
    )
    await user.type(
      screen.getByLabelText('Código da disciplina'),
      'eco0099{Enter}',
    )
    expect(preview()).toBe('SBL0084 E ECO0018 E ECO0099')
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('começa vazio e cria grupo QUALQUER dentro de TODAS', async () => {
    const { user, onChange } = setup(null)
    expect(preview()).toBe('Sem requisito')
    await user.click(screen.getByRole('button', { name: '+ Grupo' }))
    expect(screen.getAllByRole('group')).toHaveLength(2)
    const inner = screen.getAllByRole('group')[1]!
    expect(
      within(inner)
        .getByRole('button', { name: 'QUALQUER (OU)' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    await user.click(
      within(inner).getByRole('button', { name: '+ Disciplina' }),
    )
    await user.type(screen.getByLabelText('Código da disciplina'), 'SBL0084')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'subject',
      code: 'SBL0084',
    })
    await user.click(screen.getByRole('button', { name: 'Tirar grupo' }))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
})
