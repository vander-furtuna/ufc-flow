import { describe, expect, it } from 'vitest'

import { parseSigaaSchedule } from './schedule-text'
import {
  planSync,
  sectionFingerprint,
  type ScrapedSection,
  type SectionRecord,
} from './section'
import { collectableTerms, newTerm, type AcademicTerm } from './term'

const NOW = new Date('2026-11-02T12:00:00.000Z')

describe('parseSigaaSchedule', () => {
  it('lê dias, horas e a vigência', () => {
    expect(
      parseSigaaSchedule(
        'SEG 08:00-10:00\nQUA 08:00-10:00\n(10/08/2026 - 11/12/2026)',
      ),
    ).toEqual({
      slots: [
        { weekday: 1, startTime: '08:00', endTime: '10:00' },
        { weekday: 3, startTime: '08:00', endTime: '10:00' },
      ],
      validFrom: '2026-08-10',
      validTo: '2026-12-11',
    })
  })

  it('aula partida no mesmo dia, sábado e domingo', () => {
    expect(
      parseSigaaSchedule(
        'SEX 08:00-10:00\nSEX 14:00-16:00\nSAB 08:00-12:00\nDOM 08:00-09:00\n(10/08/2026 - 11/12/2026)',
      ).slots.map((slot) => `${slot.weekday} ${slot.startTime}`),
    ).toEqual(['5 08:00', '5 14:00', '6 08:00', '7 08:00'])
  })

  // Internatos de Medicina: vários blocos de datas com horários repetidos
  it('vários blocos de datas: horários sem repetição e vigência total', () => {
    expect(
      parseSigaaSchedule(
        'SEG 18:00-22:00\n(28/09/2026 - 05/10/2026)\nSEG 18:00-22:00\nTER 08:00-12:00\n(19/10/2026 - 30/10/2026)',
      ),
    ).toEqual({
      slots: [
        { weekday: 1, startTime: '18:00', endTime: '22:00' },
        { weekday: 2, startTime: '08:00', endTime: '12:00' },
      ],
      validFrom: '2026-09-28',
      validTo: '2026-10-30',
    })
  })

  it('texto fora do padrão não vira horário', () => {
    expect(parseSigaaSchedule('A DEFINIR')).toEqual({
      slots: [],
      validFrom: null,
      validTo: null,
    })
  })
})

describe('sectionFingerprint', () => {
  const slots = [
    { weekday: 3 as const, startTime: '08:00', endTime: '10:00' },
    { weekday: 1 as const, startTime: '08:00', endTime: '10:00' },
  ]

  it('não depende da ordem e muda com horário ou docente', () => {
    const base = sectionFingerprint(slots, ['2', '1'])
    expect(sectionFingerprint([...slots].reverse(), ['1', '2'])).toBe(base)
    expect(
      sectionFingerprint(
        [{ ...slots[0]!, startTime: '10:00' }, slots[1]!],
        ['1', '2'],
      ),
    ).not.toBe(base)
    expect(sectionFingerprint(slots, ['1'])).not.toBe(base)
    expect(base).toMatch(/^[0-9a-f]{8}$/)
  })
})

describe('semestres letivos', () => {
  const term = (
    code: string,
    startsAt: string,
    endsAt: string,
    isCurrent = false,
  ): AcademicTerm => ({
    id: code,
    code,
    year: Number(code.slice(0, 4)),
    period: Number(code.slice(5)) as 1 | 2,
    startsAt,
    endsAt,
    isCurrent,
  })

  it('cria a partir do código', () => {
    expect(
      newTerm(
        { code: '2026.2', startsAt: '2026-08-10', endsAt: '2026-12-11' },
        't1',
      ),
    ).toEqual({
      id: 't1',
      code: '2026.2',
      year: 2026,
      period: 2,
      startsAt: '2026-08-10',
      endsAt: '2026-12-11',
      isCurrent: false,
    })
    expect(() =>
      newTerm(
        { code: '2026.9', startsAt: '2026-08-10', endsAt: '2026-12-11' },
        't1',
      ),
    ).toThrow(expect.objectContaining({ code: 'TERM_INVALID' }))
  })

  // D68: o vigente e o que começa nos próximos 45 dias (matrícula)
  it('coleta o vigente e o próximo durante a matrícula', () => {
    const current = term('2026.2', '2026-08-10', '2026-12-11', true)
    const next = term('2027.1', '2026-12-10', '2027-04-30')
    const later = term('2027.2', '2027-08-10', '2027-12-11')
    const past = term('2026.1', '2026-03-01', '2026-07-10')
    expect(
      collectableTerms([past, current, next, later], NOW).map(
        (item) => item.code,
      ),
    ).toEqual(['2026.2', '2027.1'])
    expect(
      collectableTerms([current, next], new Date('2026-10-01T00:00:00Z')).map(
        (item) => item.code,
      ),
    ).toEqual(['2026.2'])
  })
})

describe('planSync', () => {
  const scraped = (
    overrides: Partial<ScrapedSection> = {},
  ): ScrapedSection => ({
    subjectCode: 'SBL0056',
    subjectName: 'ÁLGEBRA LINEAR',
    sectionCode: '01',
    instructors: [{ siape: '9000001', name: 'DOCENTE 1', profileUrl: '/d1' }],
    reservedSeats: 60,
    slots: [{ weekday: 1, startTime: '08:00', endTime: '10:00' }],
    validFrom: '2026-08-10',
    validTo: '2026-12-11',
    ...overrides,
  })

  const record = (overrides: Partial<SectionRecord> = {}): SectionRecord => {
    const data = scraped()
    return {
      id: 's1',
      termId: 't1',
      ...data,
      fingerprint: sectionFingerprint(data.slots, ['9000001']),
      firstSeenAt: new Date('2026-10-01T00:00:00Z'),
      lastSeenAt: new Date('2026-10-01T00:00:00Z'),
      removedAt: null,
      ...overrides,
    }
  }

  let counter = 0
  const ctx = (existing: SectionRecord[]) => ({
    termId: 't1',
    now: NOW,
    newId: () => `novo-${++counter}`,
    existing,
  })

  it('turma nova ganha id; a que já existe mantém o id pela chave natural', () => {
    const result = planSync(
      [scraped(), scraped({ sectionCode: '02' })],
      ctx([record()]),
    )
    expect(result.sections.map((section) => section.id)).toEqual([
      's1',
      expect.stringMatching(/^novo-/),
    ])
    expect(result.sections[0]).toMatchObject({
      lastSeenAt: NOW,
      firstSeenAt: new Date('2026-10-01T00:00:00Z'),
    })
    expect(result.changed).toBe(1)
    expect(result.offers).toEqual([
      { sectionId: 's1', reservedSeats: 60 },
      { sectionId: result.sections[1]!.id, reservedSeats: 60 },
    ])
  })

  it('mudança de horário troca o fingerprint e conta como alterada', () => {
    const result = planSync(
      [
        scraped({
          slots: [{ weekday: 2, startTime: '08:00', endTime: '10:00' }],
        }),
      ],
      ctx([record()]),
    )
    expect(result.changed).toBe(1)
    expect(result.sections[0]!.fingerprint).not.toBe(record().fingerprint)
  })

  it('nada mudou: zero alteradas; turma que volta perde o removed_at', () => {
    expect(planSync([scraped()], ctx([record()])).changed).toBe(0)
    const back = planSync(
      [scraped()],
      ctx([record({ removedAt: new Date('2026-10-20T00:00:00Z') })]),
    )
    expect(back.sections[0]!.removedAt).toBeNull()
    expect(back.changed).toBe(1)
  })

  it('a mesma turma repetida na página conta uma vez', () => {
    expect(planSync([scraped(), scraped()], ctx([])).sections).toHaveLength(1)
  })
})
