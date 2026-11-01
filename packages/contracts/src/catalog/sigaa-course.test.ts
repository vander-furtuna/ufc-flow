import type { SigaaCourse } from '@ufc-flow/academic-core'
import { describe, expect, expectTypeOf, it } from 'vitest'
import type { z } from 'zod'

import { sigaaCourseSchema } from './sigaa-course'

const course: SigaaCourse = {
  sigaaId: '657484',
  name: 'ENGENHARIA DE COMPUTAÇÃO',
  city: 'SOBRAL',
  modality: 'IN_PERSON',
  unitAcronym: 'CUFCSOBRAL',
  unitName: 'CAMPUS DA UFC EM SOBRAL',
}

describe('sigaaCourseSchema', () => {
  it('tem o tipo do academic-core', () => {
    expectTypeOf<
      z.infer<typeof sigaaCourseSchema>
    >().toEqualTypeOf<SigaaCourse>()
  })

  it('aceita um curso da lista pública', () => {
    expect(sigaaCourseSchema.parse(course)).toEqual(course)
  })

  it('aceita o curso lido do select, sem modalidade nem unidade', () => {
    const fromSelect = { ...course, modality: null, unitName: null }
    expect(sigaaCourseSchema.safeParse(fromSelect).success).toBe(true)
  })

  it('recusa id com letras e nome vazio', () => {
    expect(
      sigaaCourseSchema.safeParse({ ...course, sigaaId: 'A1' }).success,
    ).toBe(false)
    expect(sigaaCourseSchema.safeParse({ ...course, name: ' ' }).success).toBe(
      false,
    )
  })
})
