import type { ScheduleView } from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'

import type { Schedule } from '@/types/schedule'

import {
  fromScheduleView,
  normalizeColor,
  normalizeLocalSchedule,
  toImportEntry,
  toScheduleInput,
} from './schedule-mapper'

const SECTION = '5a9fd2b4-9eb2-40bc-abf3-ad9c7f32918e'

const view: ScheduleView = {
  id: '0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10',
  courseSlug: 'engenharia-de-computacao',
  curriculumSlug: '2006-2',
  term: '2026.2',
  name: 'Plano A',
  position: 0,
  createdAt: '2026-11-01T12:00:00.000Z',
  updatedAt: '2026-11-02T12:00:00.000Z',
  items: [
    {
      sectionId: SECTION,
      subjectCode: 'SBL0082',
      subjectName: 'MICROPROCESSADORES',
      sectionCode: '01B',
      color: 'fuchsia',
      instructors: [],
      slots: [{ weekday: 2, startTime: '16:00', endTime: '18:00' }],
      validFrom: '2026-08-10',
      validTo: null,
      addedAt: '2026-11-01T12:00:00.000Z',
      changed: true,
      removed: false,
    },
  ],
}

describe('schedule-mapper', () => {
  it('corrige a cor antiga e cai no azul quando não conhece', () => {
    expect(normalizeColor('fuschia')).toBe('fuchsia')
    expect(normalizeColor('teal')).toBe('teal')
    expect(normalizeColor('dourado')).toBe('blue')
    expect(normalizeColor(undefined)).toBe('blue')
  })

  it('converte a agenda da conta para o formato da tela, com os avisos', () => {
    const schedule = fromScheduleView(view, {
      courseId: '657484',
      reservedSeats: () => 7,
    })
    expect(schedule).toMatchObject({
      id: view.id,
      courseId: '657484',
      year: 2026,
      semester: 2,
      updatedAt: Date.parse(view.updatedAt),
    })
    expect(schedule.classes[0]).toMatchObject({
      id: SECTION,
      sectionId: '01B',
      code: 'SBL0082',
      name: 'MICROPROCESSADORES',
      color: 'fuchsia',
      reservedSeats: 7,
      changed: true,
      removed: false,
      validity: { startDate: '2026-08-10', endDate: '' },
      schedule: [
        expect.objectContaining({
          day: 'TER',
          startTime: '16:00',
          endTime: '18:00',
        }),
      ],
    })
  })

  it('monta o PUT e a importação', () => {
    const schedule = fromScheduleView(view, { courseId: '657484' })
    expect(schedule.classes[0]!.reservedSeats).toBe(0)
    expect(toScheduleInput(schedule, 2, new Set([SECTION]))).toEqual({
      courseSlug: 'engenharia-de-computacao',
      curriculumSlug: '2006-2',
      term: '2026.2',
      name: 'Plano A',
      position: 2,
      items: [
        { sectionId: SECTION, color: 'fuchsia', acknowledgeChange: true },
      ],
    })
    const local: Schedule = normalizeLocalSchedule({
      ...schedule,
      name: '   ',
      classes: schedule.classes.map((cls) => ({
        ...cls,
        color: 'fuschia' as never,
      })),
    })
    expect(
      toImportEntry(local, {
        courseSlug: 'engenharia-de-computacao',
        curriculumSlug: '2006-2',
      }),
    ).toEqual({
      id: view.id,
      courseSlug: 'engenharia-de-computacao',
      curriculumSlug: '2006-2',
      term: '2026.2',
      name: 'Agenda',
      items: [{ subjectCode: 'SBL0082', sectionCode: '01B', color: 'fuchsia' }],
    })
  })
})
