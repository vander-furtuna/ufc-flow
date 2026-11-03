import type { SubjectRecordView } from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'

import {
  canRetry,
  dayMonth,
  formatGrade,
  formatHours,
  groupByTerm,
  lastAttempt,
  parseGrade,
  periodsLeft,
  statusCounts,
  termOptions,
} from './history'

let next = 1
const record = (
  subjectCode: string,
  term: string,
  status: SubjectRecordView['status'],
  grade: number | null = null,
): SubjectRecordView => ({
  id: `r-${next++}`,
  subjectCode,
  subjectName: subjectCode,
  workloadHours: 64,
  nature: 'MANDATORY',
  term,
  status,
  grade,
  sourceRecordId: null,
  originNote: null,
  createdAt: '2026-01-01T00:00:00.000Z',
})

describe('histórico', () => {
  const records = [
    record('ECO0001', '2025.1', 'APROVADO', 8),
    record('ECO0002', '2025.1', 'REPROVADO', 3.5),
    record('ECO0003', '2025.1', 'SUPRIMIDA'),
    record('ECO0002', '2026.2', 'CURSANDO'),
    record('ECO0004', '2025.2', 'TRANCADA'),
  ]

  it('agrupa do semestre mais novo para o mais antigo', () => {
    const groups = groupByTerm(records, '2026.2')
    expect(groups.map((group) => [group.term, group.isCurrent])).toEqual([
      ['2026.2', true],
      ['2025.2', false],
      ['2025.1', false],
    ])
    expect(groups[2]).toMatchObject({
      hours: 192,
      approved: 1,
      average: 5.8,
      others: [
        ['REPROVADO', 1],
        ['SUPRIMIDA', 1],
      ],
    })
    expect(groups[1]?.average).toBeNull()
  })

  it('conta por situação', () => {
    const counts = statusCounts(records)
    expect(counts.get('APROVADO')).toBe(1)
    expect(counts.get('CURSANDO')).toBe(1)
    expect(counts.get('APROVEITADA')).toBeUndefined()
  })

  it('nova tentativa só sem tentativa depois', () => {
    expect(canRetry(records[1]!, records)).toBe(false)
    expect(canRetry(records[4]!, records)).toBe(true)
    expect(canRetry(records[0]!, records)).toBe(false)
    expect(lastAttempt(records, 'ECO0002')?.term).toBe('2026.2')
    expect(lastAttempt(records, 'XXX0001')).toBeNull()
  })

  it('semestres do vigente até o ingresso', () => {
    expect(termOptions('2026.2', '2025.1')).toEqual([
      '2026.2',
      '2026.1',
      '2025.2',
      '2025.1',
    ])
    expect(termOptions('2026.2', null)).toHaveLength(14)
  })

  it('formata horas, notas e datas', () => {
    expect(formatHours(2264)).toBe('2.264')
    expect(formatGrade(8)).toBe('8,0')
    expect(formatGrade(8.25)).toBe('8,25')
    expect(parseGrade(' 7,5 ')).toBe(7.5)
    expect(parseGrade('')).toBeNull()
    expect(parseGrade('dez')).toBeUndefined()
    expect(periodsLeft(1384, 528)).toBe(3)
    expect(periodsLeft(0, 528)).toBeNull()
    expect(periodsLeft(100, null)).toBeNull()
    expect(dayMonth('2026-12-12')).toBe('12/12')
  })
})
