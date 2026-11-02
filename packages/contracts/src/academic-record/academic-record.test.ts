import { describe, expect, it } from 'vitest'

import {
  activityRecordInputSchema,
  enrollmentInputSchema,
  subjectRecordInputSchema,
} from './academic-record'

describe('vida acadêmica', () => {
  it('matrícula só com dígitos', () => {
    const input = {
      courseSlug: 'engenharia-de-computacao',
      curriculumSlug: '2006-2',
      registrationNumber: ' 512345 ',
    }
    expect(enrollmentInputSchema.parse(input).registrationNumber).toBe('512345')
    expect(
      enrollmentInputSchema.safeParse({ ...input, registrationNumber: '51-23' })
        .success,
    ).toBe(false)
    expect(
      enrollmentInputSchema.safeParse({ ...input, registrationNumber: '123' })
        .success,
    ).toBe(false)
  })

  it('registro com nota de 0 a 10 e origem opcional', () => {
    const record = {
      subjectCode: 'ECO0018',
      term: '2025.2',
      status: 'APROVEITADA',
      grade: 8,
      originNote: '  ',
    }
    expect(subjectRecordInputSchema.parse(record).originNote).toBeNull()
    expect(
      subjectRecordInputSchema.safeParse({ ...record, grade: 11 }).success,
    ).toBe(false)
    expect(
      subjectRecordInputSchema.safeParse({ ...record, term: '2025.3' }).success,
    ).toBe(false)
  })

  it('atividade com horas e o fim depois do início', () => {
    const activity = {
      kind: 'COMPLEMENTARY',
      title: 'Monitoria de Cálculo I',
      hours: 60,
      startedOn: '2025-03-01',
      endedOn: '2025-07-01',
    }
    expect(activityRecordInputSchema.safeParse(activity).success).toBe(true)
    const reversed = activityRecordInputSchema.safeParse({
      ...activity,
      endedOn: '2025-01-01',
    })
    expect(reversed.success).toBe(false)
    expect(reversed.error?.issues[0]?.path).toEqual(['endedOn'])
    expect(
      activityRecordInputSchema.safeParse({ ...activity, hours: 0 }).success,
    ).toBe(false)
  })
})
