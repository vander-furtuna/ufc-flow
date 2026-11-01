import { describe, expect, it } from 'vitest'

import {
  hexColorSchema,
  hoursSchema,
  isoDateTimeSchema,
  slugSchema,
  subjectCodeSchema,
  termSchema,
  uuidSchema,
} from './primitives'

describe('subjectCodeSchema', () => {
  it('aceita letras maiúsculas seguidas de dígitos', () => {
    expect(subjectCodeSchema.safeParse('SBL0080').success).toBe(true)
    expect(subjectCodeSchema.safeParse('CK0211').success).toBe(true)
  })

  it('recusa minúsculas, espaços e só letras', () => {
    expect(subjectCodeSchema.safeParse('sbl0080').success).toBe(false)
    expect(subjectCodeSchema.safeParse('SBL 0080').success).toBe(false)
    expect(subjectCodeSchema.safeParse('SBL').success).toBe(false)
  })
})

describe('termSchema', () => {
  it('aceita os períodos .1 e .2 (D23)', () => {
    expect(termSchema.safeParse('2026.1').success).toBe(true)
    expect(termSchema.safeParse('2006.2').success).toBe(true)
  })

  it('recusa outros períodos e formatos', () => {
    expect(termSchema.safeParse('2026.3').success).toBe(false)
    expect(termSchema.safeParse('2026-1').success).toBe(false)
    expect(termSchema.safeParse('26.1').success).toBe(false)
  })
})

describe('slugSchema', () => {
  it('aceita minúsculas, dígitos e hífens', () => {
    expect(slugSchema.safeParse('engenharia-de-computacao').success).toBe(true)
    expect(slugSchema.safeParse('2006-2').success).toBe(true)
  })

  it('recusa maiúsculas, acentos e hífens nas pontas ou repetidos', () => {
    expect(slugSchema.safeParse('Engenharia').success).toBe(false)
    expect(slugSchema.safeParse('computação').success).toBe(false)
    expect(slugSchema.safeParse('-curso').success).toBe(false)
    expect(slugSchema.safeParse('curso--novo').success).toBe(false)
  })
})

describe('uuidSchema', () => {
  it('aceita UUID e recusa outros textos', () => {
    expect(
      uuidSchema.safeParse('0b8f6a3e-2c1d-4f5e-9a7b-3c2d1e0f9a8b').success,
    ).toBe(true)
    expect(uuidSchema.safeParse('123').success).toBe(false)
  })
})

describe('isoDateTimeSchema', () => {
  it('exige data e hora com fuso', () => {
    expect(isoDateTimeSchema.safeParse('2026-11-01T14:00:00Z').success).toBe(
      true,
    )
    expect(
      isoDateTimeSchema.safeParse('2026-11-01T14:00:00-03:00').success,
    ).toBe(true)
    expect(isoDateTimeSchema.safeParse('2026-11-01T14:00:00').success).toBe(
      false,
    )
    expect(isoDateTimeSchema.safeParse('2026-11-01').success).toBe(false)
  })
})

describe('hexColorSchema', () => {
  it('aceita #rrggbb', () => {
    expect(hexColorSchema.safeParse('#0891b2').success).toBe(true)
    expect(hexColorSchema.safeParse('#0891B2').success).toBe(true)
  })

  it('recusa outros formatos', () => {
    expect(hexColorSchema.safeParse('#fff').success).toBe(false)
    expect(hexColorSchema.safeParse('0891b2').success).toBe(false)
    expect(hexColorSchema.safeParse('cyan').success).toBe(false)
  })
})

describe('hoursSchema', () => {
  it('aceita inteiros a partir de zero', () => {
    expect(hoursSchema.safeParse(0).success).toBe(true)
    expect(hoursSchema.safeParse(64).success).toBe(true)
  })

  it('recusa negativos e frações', () => {
    expect(hoursSchema.safeParse(-1).success).toBe(false)
    expect(hoursSchema.safeParse(1.5).success).toBe(false)
  })
})
