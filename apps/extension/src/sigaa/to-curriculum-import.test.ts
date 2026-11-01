import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { CurriculumImportV1 } from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'

import { readCurriculumPage, type CurriculumPage } from './read-curriculum-page'
import { CURRICULUM_FIXTURES, loadFixture } from './test-utils'
import {
  mapSubjectType,
  toCurriculumImport,
  type ImportContext,
} from './to-curriculum-import'

const context: ImportContext = {
  course: {
    sigaaId: '657484',
    name: 'Engenharia de Computação',
    recognition: 'MATCHED',
  },
  curriculumSigaaId: null,
  extractedAt: '2026-05-29T23:23:12Z',
  url: null,
}

const page = (name: string): CurriculumPage => {
  const read = readCurriculumPage(loadFixture(name))
  if (!read) throw new Error(name)
  return read
}

const convert = (name: string) => toCurriculumImport(page(name), context)

const imported = (name: string): CurriculumImportV1 => {
  const result = convert(name)
  if (!result.data) throw new Error(JSON.stringify(result.issues))
  return result.data
}

describe('mapSubjectType', () => {
  it.each([
    ['DISCIPLINA', 'DISCIPLINE'],
    ['ATIVIDADES COMPLEMENTARES', 'COMPLEMENTARY_ACTIVITY'],
    ['ATIVIDADE COMPLEMENTAR', 'COMPLEMENTARY_ACTIVITY'],
    ['TRABALHO DE CONCLUSÃO DE CURSO', 'FINAL_PROJECT'],
    ['TRABALHO DE FINAL DE GRADUAÇÃO', 'FINAL_PROJECT'],
    ['ESTÁGIO', 'INTERNSHIP'],
    ['UNIDADE CURRICULAR ESPECIAL DE EXTENSÃO', 'EXTENSION_UNIT'],
    ['MODULO', 'MODULE'],
    ['MÓDULO', 'MODULE'],
    ['TÓPICO AVANÇADO', 'ADVANCED_TOPIC'],
    ['SEMINÁRIO', 'SEMINAR'],
    ['TUTORIA', 'TUTORING'],
    ['ATIVIDADES INTEGRADORAS DE FORMAÇÃO', 'INTEGRATIVE_ACTIVITY'],
    ['OUTRA COISA', null],
  ])('%s → %s', (label, type) => {
    expect(mapSubjectType(label)).toBe(type)
  })
})

describe('toCurriculumImport', () => {
  it.each(CURRICULUM_FIXTURES)(
    '%s vira um CurriculumImportV1 válido',
    (name) => {
      const result = convert(name)
      expect(result.issues).toEqual([])
      expect(result.warnings).toEqual([])
      expect(result.data).not.toBeNull()
    },
  )

  it('gera o mesmo conteúdo da fixture do contracts (Eng. de Computação 2006.2)', () => {
    const fixture = JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          '../../packages/contracts/fixtures/engenharia-de-computacao-2006-2.json',
        ),
        'utf8',
      ),
    ) as CurriculumImportV1
    const data = imported(
      'pagina-estrutura-engenharia-de-computacao-2006-2.html',
    )
    // As vertentes da fixture vieram do courses.ts; o SIGAA não as mostra
    const withoutBranches = (value: CurriculumImportV1) => ({
      ...value,
      branches: [],
      subjects: value.subjects.map((item) => ({ ...item, branches: [] })),
    })
    expect(withoutBranches(data)).toEqual(withoutBranches(fixture))
  })

  it('preserva o OU dos requisitos', () => {
    const eco0015 = imported(
      'estrutura-engenharia-de-computacao-2006-2.html',
    ).subjects.find((item) => item.code === 'ECO0015')
    expect(eco0015?.prerequisites).toEqual({
      kind: 'or',
      items: [
        { kind: 'subject', code: 'ECO0004' },
        { kind: 'subject', code: 'SBL0086' },
      ],
    })
  })

  it('leva os dados do curso e da origem', () => {
    const data = toCurriculumImport(page('estrutura-medicina-2024-1.html'), {
      ...context,
      curriculumSigaaId: '658760',
      url: 'https://si3.ufc.br/sigaa/graduacao/curriculo/lista.jsf',
    }).data
    expect(data?.course).toEqual(context.course)
    expect(data?.source).toEqual({
      extractedAt: context.extractedAt,
      url: 'https://si3.ufc.br/sigaa/graduacao/curriculo/lista.jsf',
    })
    expect(data?.curriculum).toMatchObject({
      code: '2024.1',
      effectiveTerm: '2024.1',
      sigaaId: '658760',
    })
  })

  it('cria as ênfases com código e cargas e liga as disciplinas', () => {
    const data = imported('estrutura-engenharia-metalurgica-2023-1.html')
    expect(data.branches[0]).toEqual({
      key: 'emphasis-2023-1e2',
      parentKey: null,
      type: 'EMPHASIS',
      name: 'EIXO DE GESTÃO E EMPREENDEDORISMO',
      description: null,
      sigaaCode: '2023.1E2',
      color: null,
      mandatoryHours: 0,
      minHours: 224,
      maxHours: null,
      minComponents: null,
      maxComponents: null,
    })
    expect(
      data.subjects.find((item) => item.code === 'TK0235')?.branches,
    ).toEqual([{ key: 'emphasis-2023-1e2', nature: 'OPTATIVE' }])
  })

  it('põe os grupos de uma ênfase como filhos dela (Psicologia)', () => {
    const data = imported('estrutura-psicologia-2025-1.html')
    expect(
      data.branches.map(({ key, parentKey, type }) => ({
        key,
        parentKey,
        type,
      })),
    ).toEqual([
      { key: 'emphasis-2026-1e1', parentKey: null, type: 'EMPHASIS' },
      {
        key: 'group-psicopatologia',
        parentKey: 'emphasis-2026-1e1',
        type: 'SPECIFIC_GROUP',
      },
      {
        key: 'group-teorias-e-tecnicas-psicoterapicas',
        parentKey: 'emphasis-2026-1e1',
        type: 'SPECIFIC_GROUP',
      },
      { key: 'emphasis-2026-1e2', parentKey: null, type: 'EMPHASIS' },
    ])
    const psi0209 = data.subjects.find((item) => item.code === 'PSI0209')
    expect(psi0209).toMatchObject({
      nature: 'OPTATIVE',
      type: 'INTERNSHIP',
      branches: [{ key: 'emphasis-2026-1e1', nature: 'MANDATORY' }],
    })
  })

  it('cria os grupos com os limites (Medicina)', () => {
    const groups = imported('estrutura-medicina-2024-1.html').branches
    expect(
      groups.map(({ key, minComponents, maxComponents }) => ({
        key,
        minComponents,
        maxComponents,
      })),
    ).toEqual([
      {
        key: 'group-internato-medico-com-recesso',
        minComponents: 2,
        maxComponents: 2,
      },
      {
        key: 'group-internato-medico-sem-recesso',
        minComponents: 4,
        maxComponents: 4,
      },
    ])
  })

  it('marca o componente anual', () => {
    const msc0186 = imported('estrutura-musica-2020-1.html').subjects.find(
      (item) => item.code === 'MSC0186',
    )
    expect(msc0186).toMatchObject({ durationTerms: 2, type: 'FINAL_PROJECT' })
  })

  it('avisa requisito ilegível e o deixa vazio', () => {
    const read = page('estrutura-engenharia-de-computacao-2006-2.html')
    const broken: CurriculumPage = {
      ...read,
      components: read.components.map((item) =>
        item.code === 'ECO0015'
          ? { ...item, prerequisitesText: '( ECO0004 OU )' }
          : item,
      ),
    }
    const result = toCurriculumImport(broken, context)
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'REQUIREMENT_UNREADABLE',
        subjectCode: 'ECO0015',
        field: 'prerequisites',
        text: '( ECO0004 OU )',
      }),
    ])
    expect(
      result.data?.subjects.find((item) => item.code === 'ECO0015')
        ?.prerequisites,
    ).toBeNull()
  })

  it('avisa tipo desconhecido e usa OTHER', () => {
    const read = page('estrutura-matematica-2024-1.html')
    const odd: CurriculumPage = {
      ...read,
      components: read.components.map((item, index) =>
        index === 0 ? { ...item, typeLabel: 'NOVO TIPO' } : item,
      ),
    }
    const result = toCurriculumImport(odd, context)
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'UNKNOWN_SUBJECT_TYPE',
        text: 'NOVO TIPO',
      }),
    ])
    expect(result.data?.subjects[0]?.type).toBe('OTHER')
  })

  it('avisa membro de vertente que não está nas tabelas e o ignora', () => {
    const read = page('estrutura-medicina-2024-1.html')
    const [first, ...rest] = read.groups
    const odd: CurriculumPage = {
      ...read,
      groups: [{ ...first!, members: [...first!.members, 'XYZ9999'] }, ...rest],
    }
    const result = toCurriculumImport(odd, context)
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'BRANCH_MEMBER_OUTSIDE',
        subjectCode: 'XYZ9999',
      }),
    ])
    expect(result.data).not.toBeNull()
  })

  it('devolve os problemas de validação sem gerar o JSON', () => {
    const read = page('estrutura-matematica-2024-1.html')
    const result = toCurriculumImport(
      { ...read, header: { ...read.header, effectiveTerm: '20241' } },
      context,
    )
    expect(result.data).toBeNull()
    expect(result.issues[0]).toMatchObject({
      path: ['curriculum', 'effectiveTerm'],
    })
  })
})
