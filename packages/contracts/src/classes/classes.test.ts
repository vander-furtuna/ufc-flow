import { describe, expect, it } from 'vitest'

import {
  academicTermInputSchema,
  courseSectionsSchema,
  scrapeRunSchema,
  updateAcademicTermInputSchema,
  weekdaySchema,
} from './classes'

const ID = '0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10'

describe('semestres letivos', () => {
  it('aceita código, início e fim em ordem', () => {
    expect(
      academicTermInputSchema.safeParse({
        code: '2026.2',
        startsAt: '2026-08-10',
        endsAt: '2026-12-11',
      }).success,
    ).toBe(true)
  })

  it('recusa termo inválido, data sem formato e fim antes do início', () => {
    expect(
      academicTermInputSchema.safeParse({
        code: '2026.3',
        startsAt: '2026-08-10',
        endsAt: '2026-12-11',
      }).success,
    ).toBe(false)
    expect(
      academicTermInputSchema.safeParse({
        code: '2026.2',
        startsAt: '10/08/2026',
        endsAt: '2026-12-11',
      }).success,
    ).toBe(false)
    const reversed = updateAcademicTermInputSchema.safeParse({
      startsAt: '2026-12-11',
      endsAt: '2026-08-10',
    })
    expect(reversed.error?.issues[0]?.path).toEqual(['endsAt'])
  })
})

describe('turmas', () => {
  it('aceita a resposta das turmas de um curso', () => {
    expect(
      courseSectionsSchema.safeParse({
        term: '2026.2',
        courseSlug: 'engenharia-de-computacao',
        collectedAt: '2026-11-02T12:00:00.000Z',
        subjects: [
          {
            code: 'SBL0056',
            name: 'ÁLGEBRA LINEAR',
            sections: [
              {
                id: ID,
                subjectCode: 'SBL0056',
                sectionCode: '01',
                instructors: [
                  { siape: '9000001', name: 'DOCENTE 1', profileUrl: '/x' },
                ],
                reservedSeats: 60,
                slots: [{ weekday: 1, startTime: '08:00', endTime: '10:00' }],
                validFrom: '2026-08-10',
                validTo: '2026-12-11',
                fingerprint: 'abc',
              },
            ],
          },
        ],
      }).success,
    ).toBe(true)
  })

  it('dia da semana vai de 1 a 7', () => {
    expect(weekdaySchema.safeParse(7).success).toBe(true)
    expect(weekdaySchema.safeParse(0).success).toBe(false)
  })

  it('aceita a coleta', () => {
    expect(
      scrapeRunSchema.safeParse({
        id: ID,
        courseSlug: 'engenharia-de-computacao',
        term: '2026.2',
        trigger: 'MANUAL',
        status: 'FAILED',
        startedAt: '2026-11-02T12:00:00.000Z',
        finishedAt: '2026-11-02T12:00:05.000Z',
        sectionsSeen: 0,
        sectionsChanged: 0,
        error: 'SIGAA fora do ar',
      }).success,
    ).toBe(true)
  })
})
