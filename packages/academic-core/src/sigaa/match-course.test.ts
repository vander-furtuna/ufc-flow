import { describe, expect, it } from 'vitest'

import catalog from '../__fixtures__/sigaa-courses.json'
import { matchSigaaCourse, type SigaaCourse } from './match-course'

const courses = catalog as SigaaCourse[]

const SOBRAL_UNIT = 'CAMPUS DA UFC EM SOBRAL (11.00.01.28)'

// Cabeçalhos reais de "Dados da Estrutura Curricular" de 11 cursos
const headers: [string, string, string, string][] = [
  [
    'AGRONOMIA - FORTALEZA - Presencial - MT - BACHARELADO',
    'CENTRO DE CIÊNCIAS AGRÁRIAS (11.00.01.18)',
    'FORTALEZA - CE',
    '657420',
  ],
  [
    'ARQUITETURA E URBANISMO - FORTALEZA - Presencial - MT - BACHARELADO',
    'INSTITUTO DE ARQUITETURA E URBANISMO E DESIGN (11.00.01.86)',
    'FORTALEZA - CE',
    '657473',
  ],
  [
    'CIÊNCIA DE DADOS - FORTALEZA - Presencial - MT - BACHARELADO',
    'CENTRO DE CIÊNCIAS (11.00.01.21)',
    'FORTALEZA - CE',
    '75287727',
  ],
  [
    'ENGENHARIA DE COMPUTAÇÃO - SOBRAL - Presencial - MT - BACHARELADO',
    SOBRAL_UNIT,
    'SOBRAL - CE',
    '657484',
  ],
  [
    'ENGENHARIA DE MATERIAIS - JUAZEIRO DO NORTE - Presencial - ENGENHARIA DE MATERIAIS - MT - FORMAÇÃO',
    'CAMPUS DA UFC NO CARIRI (11.01.32)',
    'JUAZEIRO DO NORTE - CE',
    '657513',
  ],
  [
    'ENGENHARIA METALÚRGICA - FORTALEZA - Presencial - ENGENHARIA METALURGICA - MT - BACHARELADO',
    'CENTRO DE TECNOLOGIA (11.00.01.19)',
    'FORTALEZA - CE',
    '657477',
  ],
  [
    'GESTÃO DE POLÍTICAS PÚBLICAS - FORTALEZA - Presencial - MT - BACHARELADO',
    'CENTRO DE CIÊNCIAS AGRÁRIAS (11.00.01.18)',
    'FORTALEZA - CE',
    '2168903',
  ],
  [
    'MATEMÁTICA - LICENCIATURA - FORTALEZA - Presencial - TN - LICENCIATURA',
    'CENTRO DE CIÊNCIAS (11.00.01.21)',
    'FORTALEZA - CE',
    '657433',
  ],
  [
    'MEDICINA - SOBRAL - SOBRAL - Presencial - MTN - BACHARELADO',
    SOBRAL_UNIT,
    'SOBRAL - CE',
    '657494',
  ],
  [
    'MÚSICA-LICENCIATURA - SOBRAL - Presencial - TN - LICENCIATURA',
    SOBRAL_UNIT,
    'SOBRAL - CE',
    '657523',
  ],
  [
    'PSICOLOGIA/CCGPSIC - SOBRAL - SOBRAL - Presencial - MT - BACHARELADO',
    SOBRAL_UNIT,
    'SOBRAL - CE',
    '657487',
  ],
]

const ids = (list: readonly SigaaCourse[]) => list.map((item) => item.sigaaId)

describe('matchSigaaCourse', () => {
  it.each(headers)('reconhece %s', (matrixName, unitName, city, sigaaId) => {
    const result = matchSigaaCourse({ matrixName, unitName, city }, courses)
    expect(result.status).toBe('MATCHED')
    expect(result.course?.sigaaId).toBe(sigaaId)
  })

  it('separa presencial de a distância pela modalidade da matriz', () => {
    const result = matchSigaaCourse(
      {
        matrixName: 'FÍSICA - FORTALEZA - A Distância - N - LICENCIATURA',
        unitName: 'INSTITUTO UNIVERSIDADE VIRTUAL (11.00.01.35)',
        city: 'FORTALEZA - CE',
      },
      courses,
    )
    expect(result.course?.sigaaId).toBe('6491866')
  })

  it('não decide entre turnos: diurno e noturno ficam ambíguos', () => {
    const result = matchSigaaCourse(
      {
        matrixName: 'ADMINISTRAÇÃO - FORTALEZA - Presencial - N - BACHARELADO',
        unitName:
          'FACULDADE DE ECONOMIA ADMINISTRAÇÃO ATUARIA E CONTABILIDADE (11.00.01.07)',
        city: 'FORTALEZA - CE',
      },
      courses,
    )
    expect(result.status).toBe('AMBIGUOUS')
    expect(result.course).toBeNull()
    expect(ids(result.candidates).sort()).toEqual(['657446', '657452'])
  })

  it('sem curso com o nome, sugere os da mesma cidade e unidade', () => {
    const result = matchSigaaCourse(
      {
        matrixName: 'CURSO NOVO - SOBRAL - Presencial - MT - BACHARELADO',
        unitName: SOBRAL_UNIT,
        city: 'SOBRAL - CE',
      },
      courses,
    )
    expect(result.status).toBe('NOT_FOUND')
    expect(result.candidates).toHaveLength(9)
    expect(result.candidates.every((item) => item.city === 'SOBRAL')).toBe(true)
  })

  it('não exige a unidade quando ela não bate', () => {
    const result = matchSigaaCourse(
      {
        matrixName:
          'ENGENHARIA DE COMPUTAÇÃO - SOBRAL - Presencial - MT - BACHARELADO',
        unitName: 'OUTRA UNIDADE (1.1)',
        city: 'SOBRAL - CE',
      },
      courses,
    )
    expect(result.course?.sigaaId).toBe('657484')
  })

  it('funciona com o catálogo do select do SIGAA, sem modalidade nem unidade', () => {
    const fromSelect: SigaaCourse[] = courses.map((item) => ({
      ...item,
      modality: null,
      unitName: null,
    }))
    const result = matchSigaaCourse(
      {
        matrixName:
          'ENGENHARIA DE COMPUTAÇÃO - SOBRAL - Presencial - MT - BACHARELADO',
        unitName: null,
        city: 'SOBRAL - CE',
      },
      fromSelect,
    )
    expect(result.course?.sigaaId).toBe('657484')
  })

  it('não confunde prefixo no meio de palavra', () => {
    const result = matchSigaaCourse(
      {
        matrixName: 'MEDICINAL - SOBRAL - Presencial',
        unitName: null,
        city: 'SOBRAL - CE',
      },
      courses,
    )
    expect(result.status).toBe('NOT_FOUND')
  })

  it('devolve nada com o catálogo vazio', () => {
    expect(
      matchSigaaCourse(
        { matrixName: 'AGRONOMIA - FORTALEZA', unitName: null, city: null },
        [],
      ),
    ).toEqual({ status: 'NOT_FOUND', course: null, candidates: [] })
  })
})
