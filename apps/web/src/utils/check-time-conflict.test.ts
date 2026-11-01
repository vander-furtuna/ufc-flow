import { describe, expect, it } from 'vitest'

import type { ClassSection } from '@/types/class'
import { checkTimeConflict } from './check-time-conflict'

const section = (
  id: string,
  schedule: [day: string, startTime: string, endTime: string][],
): ClassSection => ({
  id,
  term: '2026.2',
  sectionId: '01',
  instructors: [],
  reservedSeats: 0,
  validity: { startDate: '2026-08-01', endDate: '2026-12-15' },
  code: `ECO${id}`,
  name: `Disciplina ${id}`,
  schedule: schedule.map(([day, startTime, endTime], index) => ({
    id: `${id}-${index}`,
    day,
    startTime,
    endTime,
  })),
})

describe('checkTimeConflict', () => {
  const segunda = section('001', [['SEG', '08:00', '10:00']])
  const segundaETerca = section('002', [
    ['SEG', '09:00', '11:00'],
    ['TER', '14:00', '16:00'],
  ])
  const quarta = section('003', [['QUA', '08:00', '10:00']])

  it('devolve as turmas em conflito', () => {
    const nova = section('100', [['seg', '08:30', '09:30']])
    expect(checkTimeConflict(nova, [segunda, segundaETerca, quarta])).toEqual([
      segunda,
      segundaETerca,
    ])
  })

  it('não acusa horários que só se encostam nem a própria turma', () => {
    const nova = section('100', [['QUA', '10:00', '12:00']])
    expect(checkTimeConflict(nova, [quarta])).toEqual([])
    expect(checkTimeConflict(segunda, [segunda])).toEqual([])
  })

  it('aceita hora sem zero à esquerda e ignora horários inválidos', () => {
    const nova = section('100', [
      ['SEG', '8:00', '9:00'],
      ['XYZ', '08:00', '10:00'],
      ['QUA', '??', '10:00'],
      ['QUI', '25:00', '26:00'],
    ])
    expect(checkTimeConflict(nova, [segunda, quarta])).toEqual([segunda])
  })
})
