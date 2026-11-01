import { describe, expect, it } from 'vitest'

import {
  findConflictingSections,
  hasTimeConflict,
  isValidTime,
  slotsOverlap,
  timeToMinutes,
} from './time-conflict'
import type { TimeSlot } from './types'

const slot = (
  weekday: TimeSlot['weekday'],
  startTime: string,
  endTime: string,
): TimeSlot => ({ weekday, startTime, endTime })

describe('timeToMinutes', () => {
  it('converte HH:MM e HH:MM:SS', () => {
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('08:00')).toBe(480)
    expect(timeToMinutes('13:30:00')).toBe(810)
    expect(timeToMinutes('23:59')).toBe(1439)
  })

  it.each(['8:00', '24:00', '12:60', '12', '', 'ab:cd', '12:00:99'])(
    'rejeita %j',
    (time) => {
      expect(() => timeToMinutes(time)).toThrow(RangeError)
    },
  )
})

describe('isValidTime', () => {
  it('aceita HH:MM e HH:MM:SS válidos', () => {
    expect(isValidTime('00:00')).toBe(true)
    expect(isValidTime('23:59:59')).toBe(true)
  })

  it('recusa horas fora do formato', () => {
    expect(isValidTime('8:00')).toBe(false)
    expect(isValidTime('25:00')).toBe(false)
    expect(isValidTime('')).toBe(false)
  })
})

describe('slotsOverlap', () => {
  it('detecta sobreposição no mesmo dia', () => {
    expect(
      slotsOverlap(slot(2, '08:00', '10:00'), slot(2, '09:00', '11:00')),
    ).toBe(true)
  })

  it('detecta um horário dentro do outro', () => {
    expect(
      slotsOverlap(slot(3, '08:00', '12:00'), slot(3, '09:00', '10:00')),
    ).toBe(true)
  })

  it('horários que só se encostam não conflitam', () => {
    expect(
      slotsOverlap(slot(1, '08:00', '10:00'), slot(1, '10:00', '12:00')),
    ).toBe(false)
  })

  it('dias diferentes não conflitam', () => {
    expect(
      slotsOverlap(slot(1, '08:00', '10:00'), slot(2, '08:00', '10:00')),
    ).toBe(false)
  })

  it('compara HH:MM com HH:MM:SS', () => {
    expect(
      slotsOverlap(slot(4, '08:00:00', '10:00:00'), slot(4, '09:59', '11:00')),
    ).toBe(true)
  })
})

describe('hasTimeConflict', () => {
  it('confere todos os horários das duas turmas', () => {
    const a = [slot(1, '08:00', '10:00'), slot(3, '08:00', '10:00')]
    const b = [slot(2, '08:00', '10:00'), slot(3, '09:00', '11:00')]
    const c = [slot(2, '10:00', '12:00'), slot(5, '08:00', '10:00')]
    expect(hasTimeConflict(a, b)).toBe(true)
    expect(hasTimeConflict(a, c)).toBe(false)
  })

  it('turma sem horário não conflita', () => {
    expect(hasTimeConflict([], [slot(1, '08:00', '10:00')])).toBe(false)
  })
})

describe('findConflictingSections', () => {
  const sections = [
    { id: 's1', slots: [slot(1, '08:00', '10:00')] },
    { id: 's2', slots: [slot(1, '09:00', '11:00'), slot(3, '14:00', '16:00')] },
    { id: 's3', slots: [slot(2, '08:00', '10:00')] },
  ]

  it('devolve as turmas em conflito, na ordem recebida', () => {
    const candidate = {
      id: 'new',
      slots: [slot(1, '08:30', '09:30'), slot(3, '15:00', '17:00')],
    }
    expect(findConflictingSections(candidate, sections)).toEqual([
      sections[0],
      sections[1],
    ])
  })

  it('ignora a própria turma', () => {
    expect(findConflictingSections(sections[0]!, sections)).toEqual([
      sections[1],
    ])
  })

  it('devolve lista vazia sem conflitos', () => {
    const candidate = { id: 'new', slots: [slot(6, '08:00', '12:00')] }
    expect(findConflictingSections(candidate, sections)).toEqual([])
  })
})
