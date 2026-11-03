import { describe, expect, it } from 'vitest'

import { isCloseReminderDue } from './close-reminder'

const base = {
  inProgressCount: 2,
  staleCount: 0,
  termEndsAt: '2026-12-11',
}

describe('aviso de fechar situação', () => {
  it.each([
    ['2026-11-19', false],
    ['2026-11-20', true],
    ['2026-12-11', true],
    ['2027-01-10', true],
  ])('em %s, com CURSANDO no semestre vigente: %s', (today, due) => {
    expect(isCloseReminderDue({ ...base, today })).toBe(due)
  })

  it('sem CURSANDO não há o que fechar', () => {
    expect(
      isCloseReminderDue({ ...base, inProgressCount: 0, today: '2026-12-01' }),
    ).toBe(false)
  })

  it('CURSANDO de semestre passado avisa sempre', () => {
    expect(
      isCloseReminderDue({
        inProgressCount: 0,
        staleCount: 1,
        termEndsAt: null,
        today: '2026-09-01',
      }),
    ).toBe(true)
  })

  it('sem semestre vigente, só os passados avisam', () => {
    expect(
      isCloseReminderDue({ ...base, termEndsAt: null, today: '2026-12-10' }),
    ).toBe(false)
  })
})
