import { describe, expect, it } from 'vitest'

import {
  newSubject,
  setEquivalences,
  subjectSlug,
  subjectWorkload,
  updateGlobalSubject,
} from './subject'
import { aSubject } from './testing/builders'

const NOW = new Date('2026-11-01T12:00:00.000Z')
const CALCULO = aSubject({ code: 'SBL0084', name: 'Cálculo Numérico' })

describe('Disciplina global: nome', () => {
  it('livre mesmo em EC publicada', () => {
    const updated = updateGlobalSubject(
      CALCULO,
      { name: 'Cálculo Numérico I' },
      { usedInPublished: true, now: NOW },
    )
    expect(updated).toMatchObject({
      name: 'Cálculo Numérico I',
      updatedAt: NOW,
    })
  })
})

describe('Disciplina global: código, cargas e créditos', () => {
  it.each([
    ['code', { code: 'SBL0085' }],
    ['workloadHours', { workloadHours: 96 }],
    ['labHours', { labHours: 32 }],
    ['credits', { credits: 6 }],
  ])('%s: bloqueado se usada em EC publicada', (_, patch) => {
    expect(() =>
      updateGlobalSubject(CALCULO, patch, { usedInPublished: true, now: NOW }),
    ).toThrow(expect.objectContaining({ code: 'SUBJECT_LOCKED_FIELD' }))
  })

  it('livre se só está em rascunhos', () => {
    const updated = updateGlobalSubject(
      CALCULO,
      { code: 'SBL0085', workloadHours: 96, credits: 6 },
      { usedInPublished: false, now: NOW },
    )
    expect(updated).toMatchObject({
      code: 'SBL0085',
      workloadHours: 96,
      credits: 6,
    })
  })

  it('valor igual não conta como mudança', () => {
    expect(
      updateGlobalSubject(
        CALCULO,
        { workloadHours: CALCULO.workloadHours },
        { usedInPublished: true, now: NOW },
      ).workloadHours,
    ).toBe(64)
  })
})

describe('Equivalências', () => {
  it('troca a expressão', () => {
    const expr = { kind: 'subject' as const, code: 'CEC0058' }
    expect(setEquivalences(CALCULO, expr, NOW).equivalences).toEqual(expr)
    expect(setEquivalences(CALCULO, null, NOW).equivalences).toBeNull()
  })

  it('recusa a própria disciplina na expressão', () => {
    expect(() =>
      setEquivalences(
        CALCULO,
        {
          kind: 'or',
          items: [
            { kind: 'subject', code: 'CEC0058' },
            { kind: 'subject', code: 'SBL0084' },
          ],
        },
        NOW,
      ),
    ).toThrow(expect.objectContaining({ code: 'SUBJECT_SELF_EQUIVALENCE' }))
  })
})

describe('apoio', () => {
  it('cria a disciplina e calcula slug e cargas', () => {
    const subject = newSubject(
      {
        id: 's1',
        code: 'ECO0083',
        name: 'Inteligência Computacional',
        type: 'DISCIPLINE',
        durationTerms: 1,
        workloadHours: 64,
        theoryHours: 64,
        labHours: 0,
        eadHours: 0,
        extensionHours: 0,
        credits: 4,
      },
      NOW,
    )
    expect(subject).toMatchObject({ equivalences: null, createdAt: NOW })
    expect(subjectSlug('Inteligência Computacional (Teoria)')).toBe(
      'inteligencia-computacional-teoria',
    )
    expect(subjectWorkload(subject)).toEqual({
      workloadHours: 64,
      theoryHours: 64,
      labHours: 0,
      eadHours: 0,
      extensionHours: 0,
      credits: 4,
    })
  })
})
