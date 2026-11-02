import { describe, expect, it } from 'vitest'

import { toLegacySubjectGroups } from './legacy-sections'

describe('toLegacySubjectGroups', () => {
  it('converte as turmas da API para o formato da agenda local', () => {
    const groups = toLegacySubjectGroups({
      term: '2026.2',
      courseSlug: 'engenharia-de-computacao',
      collectedAt: '2026-11-02T12:00:00.000Z',
      subjects: [
        {
          code: 'SBL0056',
          name: 'ÁLGEBRA LINEAR',
          sections: [
            {
              id: '0b6f8a2e-4d7c-4f1a-9a37-1f2a3b4c5d6e',
              subjectCode: 'SBL0056',
              sectionCode: '01',
              instructors: [
                { siape: '9000001', name: 'DOCENTE 1', profileUrl: '/d1' },
              ],
              reservedSeats: 60,
              slots: [
                { weekday: 1, startTime: '08:00', endTime: '10:00' },
                { weekday: 6, startTime: '07:00', endTime: '11:00' },
              ],
              validFrom: '2026-08-10',
              validTo: null,
              fingerprint: 'abcd1234',
            },
          ],
        },
      ],
    })
    expect(groups).toEqual([
      {
        code: 'SBL0056',
        name: 'ÁLGEBRA LINEAR',
        classes: [
          {
            id: '0b6f8a2e-4d7c-4f1a-9a37-1f2a3b4c5d6e',
            term: '2026.2',
            sectionId: '01',
            instructors: [
              { siape: '9000001', name: 'DOCENTE 1', profileUrl: '/d1' },
            ],
            reservedSeats: 60,
            schedule: [
              expect.objectContaining({
                day: 'SEG',
                startTime: '08:00',
                endTime: '10:00',
              }),
              expect.objectContaining({ day: 'SAB', startTime: '07:00' }),
            ],
            validity: { startDate: '2026-08-10', endDate: '' },
            code: 'SBL0056',
            name: 'ÁLGEBRA LINEAR',
          },
        ],
      },
    ])
  })
})
