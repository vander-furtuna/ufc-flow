import type { TimeSlot } from '@ufc-flow/academic-core'
import { describe, expect, it } from 'vitest'

import {
  importItems,
  replaceItems,
  type ScheduleItem,
  type SectionSnapshot,
} from './schedule'

const NOW = new Date('2026-11-02T12:00:00.000Z')
const BEFORE = new Date('2026-10-01T12:00:00.000Z')

const slot = (
  weekday: TimeSlot['weekday'],
  startTime: string,
  endTime: string,
): TimeSlot => ({ weekday, startTime, endTime })

const section = (
  id: string,
  subjectCode: string,
  slots: TimeSlot[],
  overrides: Partial<SectionSnapshot> = {},
): SectionSnapshot => ({
  id,
  termId: 't1',
  subjectCode,
  sectionCode: '01',
  slots,
  fingerprint: `fp-${id}`,
  removed: false,
  ...overrides,
})

const algebra = section('s1', 'SBL0056', [slot(1, '08:00', '10:00')])
const calculo = section('s2', 'SBL0057', [slot(2, '08:00', '10:00')])
const algebra02 = section('s3', 'SBL0056', [slot(5, '08:00', '10:00')])
const grafos = section('s4', 'ECO0046', [slot(1, '09:00', '11:00')])

const sections = new Map(
  [algebra, calculo, algebra02, grafos].map((item) => [item.id, item]),
)

const kept = (overrides: Partial<ScheduleItem> = {}): ScheduleItem => ({
  sectionId: 's1',
  subjectCode: 'SBL0056',
  color: 'blue',
  slotsFingerprint: 'fp-s1',
  addedAt: BEFORE,
  ...overrides,
})

const replace = (
  current: ScheduleItem[],
  input: { sectionId: string; color?: 'red'; acknowledgeChange?: boolean }[],
  lookup = sections,
) =>
  replaceItems({
    current,
    input: input.map((item) => ({ color: 'red' as const, ...item })),
    sections: lookup,
    termId: 't1',
    now: NOW,
  })

describe('replaceItems', () => {
  it('turma nova guarda o fingerprint atual; a que fica mantém o dela', () => {
    const items = replace(
      [kept({ slotsFingerprint: 'antigo' })],
      [{ sectionId: 's1' }, { sectionId: 's2' }],
    )
    expect(items).toEqual([
      kept({ slotsFingerprint: 'antigo', color: 'red' }),
      {
        sectionId: 's2',
        subjectCode: 'SBL0057',
        color: 'red',
        slotsFingerprint: 'fp-s2',
        addedAt: NOW,
      },
    ])
  })

  it('dispensar o aviso grava o fingerprint atual', () => {
    const [item] = replace(
      [kept({ slotsFingerprint: 'antigo' })],
      [{ sectionId: 's1', acknowledgeChange: true }],
    )
    expect(item!.slotsFingerprint).toBe('fp-s1')
  })

  it('recusa turma de outro semestre, inexistente ou repetida', () => {
    const other = new Map(sections)
    other.set('s9', section('s9', 'ECO0001', [], { termId: 't2' }))
    expect(() => replace([], [{ sectionId: 's9' }], other)).toThrow(
      expect.objectContaining({ code: 'SCHEDULE_SECTION_NOT_FOUND' }),
    )
    expect(() => replace([], [{ sectionId: 'nada' }])).toThrow(
      expect.objectContaining({ code: 'SCHEDULE_SECTION_NOT_FOUND' }),
    )
    expect(() =>
      replace([], [{ sectionId: 's1' }, { sectionId: 's1' }]),
    ).toThrow(expect.objectContaining({ code: 'SCHEDULE_DUPLICATE_SUBJECT' }))
  })

  it('uma turma por disciplina e nenhum conflito para turmas novas', () => {
    expect(() =>
      replace([kept()], [{ sectionId: 's1' }, { sectionId: 's3' }]),
    ).toThrow(expect.objectContaining({ code: 'SCHEDULE_DUPLICATE_SUBJECT' }))
    expect(() =>
      replace([kept()], [{ sectionId: 's1' }, { sectionId: 's4' }]),
    ).toThrow(expect.objectContaining({ code: 'SCHEDULE_TIME_CONFLICT' }))
  })

  it('conflito criado pelo SIGAA entre turmas que já estavam não bloqueia', () => {
    const moved = new Map(sections)
    moved.set('s2', { ...calculo, slots: [slot(1, '09:00', '10:00')] })
    const current = [kept(), kept({ sectionId: 's2', subjectCode: 'SBL0057' })]
    expect(
      replace(current, [{ sectionId: 's1' }, { sectionId: 's2' }], moved),
    ).toHaveLength(2)
  })

  it('turma removida do SIGAA fica se já estava, mas não entra nova', () => {
    const gone = new Map(sections)
    gone.set('s1', { ...algebra, removed: true })
    expect(replace([kept()], [{ sectionId: 's1' }], gone)).toHaveLength(1)
    expect(() => replace([], [{ sectionId: 's1' }], gone)).toThrow(
      expect.objectContaining({ code: 'SCHEDULE_SECTION_REMOVED' }),
    )
  })
})

describe('importItems', () => {
  it('entra na ordem e pula repetida e conflito, com o motivo', () => {
    const result = importItems(
      [
        { section: algebra, color: 'blue' },
        { section: algebra02, color: 'red' },
        { section: grafos, color: 'teal' },
        { section: calculo, color: 'lime' },
        { section: calculo, color: 'lime' },
      ],
      NOW,
    )
    expect(result.items.map((item) => item.sectionId)).toEqual(['s1', 's2'])
    expect(result.items[0]).toMatchObject({
      color: 'blue',
      slotsFingerprint: 'fp-s1',
      addedAt: NOW,
    })
    expect(result.skipped).toEqual([
      { sectionId: 's3', reason: 'SCHEDULE_DUPLICATE_SUBJECT' },
      { sectionId: 's4', reason: 'SCHEDULE_TIME_CONFLICT' },
      { sectionId: 's2', reason: 'SCHEDULE_DUPLICATE_SUBJECT' },
    ])
  })
})
