import type { SigaaCourse } from '@ufc-flow/academic-core'
import { describe, expect, it } from 'vitest'

import {
  campusForSigaaCourse,
  checkCourseDeletion,
  checkImportCourse,
  slugify,
  titleCase,
} from './course'
import { anImport } from './testing/imports'

const ENG_COMP: SigaaCourse = {
  sigaaId: '415113',
  name: 'ENGENHARIA DE COMPUTAÇÃO',
  city: 'SOBRAL',
  modality: 'IN_PERSON',
  unitAcronym: 'CUFCSOBRAL',
  unitName: 'CAMPUS DA UFC EM SOBRAL',
}

describe('curso e campus', () => {
  it('nomeia o campus pela unidade do interior ou pela cidade', () => {
    expect(campusForSigaaCourse(ENG_COMP)).toEqual({
      slug: 'sobral',
      name: 'Campus da UFC em Sobral',
      city: 'Sobral',
      state: 'CE',
    })
    expect(
      campusForSigaaCourse({
        ...ENG_COMP,
        city: 'FORTALEZA',
        unitName: 'CENTRO DE TECNOLOGIA',
      }),
    ).toMatchObject({ slug: 'fortaleza', name: 'UFC em Fortaleza' })
    expect(
      campusForSigaaCourse({ ...ENG_COMP, city: 'CRATEÚS', unitName: null }),
    ).toMatchObject({ slug: 'crateus', city: 'Crateús' })
  })

  it('formata nomes do SIGAA', () => {
    expect(titleCase('SÃO GONÇALO DO AMARANTE')).toBe('São Gonçalo do Amarante')
    expect(slugify('Engenharia de Computação')).toBe('engenharia-de-computacao')
  })

  it('só exclui curso sem EC publicada', () => {
    expect(() => checkCourseDeletion(0)).not.toThrow()
    expect(() => checkCourseDeletion(1)).toThrow(
      expect.objectContaining({ code: 'COURSE_HAS_PUBLISHED_CURRICULA' }),
    )
  })
})

describe('checkImportCourse', () => {
  it('aceita arquivo da mesma matriz, unidade e cidade', () => {
    expect(() => checkImportCourse(anImport(), ENG_COMP)).not.toThrow()
  })

  it('recusa matriz de outro curso, a não ser na escolha manual', () => {
    const other = anImport({
      curriculum: {
        matrixName: 'MEDICINA - SOBRAL - Presencial - MT - BACHARELADO',
      },
    })
    expect(() => checkImportCourse(other, ENG_COMP)).toThrow(
      expect.objectContaining({ code: 'CURRICULUM_IMPORT_COURSE_MISMATCH' }),
    )
    const manual = anImport({
      course: { recognition: 'MANUAL' },
      curriculum: {
        matrixName: 'MEDICINA - SOBRAL - Presencial - MT - BACHARELADO',
      },
    })
    expect(() => checkImportCourse(manual, ENG_COMP)).not.toThrow()
  })
})
