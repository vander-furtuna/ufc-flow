import { describe, expect, it } from 'vitest'

import { loadFixture } from '../sigaa/test-utils'
import { extractCurriculum } from './extraction'

const base = {
  search: { selectedCourseId: null, courses: [], curriculum: null },
  manualCourseId: null,
  now: new Date('2026-11-01T12:00:00Z'),
  url: 'https://si3.ufc.br/sigaa/graduacao/curriculo/lista.jsf',
}

describe('extractCurriculum', () => {
  it('devolve null fora da página da estrutura', () => {
    expect(
      extractCurriculum({ ...base, doc: loadFixture('busca-estruturas.html') }),
    ).toBeNull()
  })

  it('reconhece o curso, gera o JSON e resume para o popup', () => {
    const result = extractCurriculum({
      ...base,
      doc: loadFixture('estrutura-psicologia-2025-1.html'),
    })!
    expect(result.exportable).toBe(true)
    expect(result.data?.course).toEqual({
      sigaaId: '657487',
      name: 'Psicologia/Ccgpsic - Sobral',
      recognition: 'MATCHED',
    })
    expect(result.data?.source).toEqual({
      extractedAt: '2026-11-01T12:00:00.000Z',
      url: base.url,
    })
    expect(result.summary).toEqual({
      courseName: 'Psicologia/Ccgpsic - Sobral',
      code: '2026.1',
      city: 'SOBRAL - CE',
      sigaaId: '657487',
      components: 163,
      branches: 4,
      toReview: 0,
    })
  })

  it('usa o curso e a EC capturados na tela de busca', () => {
    const result = extractCurriculum({
      ...base,
      doc: loadFixture('estrutura-engenharia-de-computacao-2006-2.html'),
      search: {
        selectedCourseId: '657484',
        courses: [],
        curriculum: { code: '2006.2', sigaaId: '658760' },
      },
    })!
    expect(result.data?.course.recognition).toBe('SELECTED')
    expect(result.data?.curriculum.sigaaId).toBe('658760')
    expect(result.summary.toReview).toBe(1)
  })

  it('não usa o id capturado de outra EC', () => {
    const result = extractCurriculum({
      ...base,
      doc: loadFixture('estrutura-engenharia-de-computacao-2006-2.html'),
      search: {
        selectedCourseId: null,
        courses: [],
        curriculum: { code: '2025.1', sigaaId: '1' },
      },
    })!
    expect(result.data?.curriculum.sigaaId).toBeNull()
  })

  it('sem curso decidido, mostra a grade mas não deixa exportar', () => {
    const result = extractCurriculum({
      ...base,
      doc: loadFixture('estrutura-engenharia-de-computacao-2006-2.html'),
      search: { selectedCourseId: '657420', courses: [], curriculum: null },
    })!
    expect(result.exportable).toBe(false)
    expect(result.data).not.toBeNull()
    expect(result.summary).toMatchObject({ sigaaId: null, toReview: 2 })
    expect(result.course.candidates).toHaveLength(2)
  })

  it('aceita a escolha manual e os cursos novos do select', () => {
    const novo = {
      sigaaId: '99',
      name: 'CURSO NOVO',
      city: 'SOBRAL',
      modality: null,
      unitAcronym: 'CUFCSOBRAL',
      unitName: null,
    }
    const result = extractCurriculum({
      ...base,
      doc: loadFixture('estrutura-engenharia-de-computacao-2006-2.html'),
      search: { selectedCourseId: null, courses: [novo], curriculum: null },
      manualCourseId: '99',
    })!
    expect(result.data?.course).toEqual({
      sigaaId: '99',
      name: 'Curso Novo',
      recognition: 'MANUAL',
    })
  })
})
