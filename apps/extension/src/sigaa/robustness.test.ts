import type { SigaaCourse } from '@ufc-flow/academic-core'
import { describe, expect, it } from 'vitest'

import catalog from './catalog/sigaa-courses.json'
import { resolveCourse } from './course'
import { readCurriculumPage } from './read-curriculum-page'
import { readSearchPage } from './read-search-page'
import { reviewImport } from './review'
import { toCurriculumImport } from './to-curriculum-import'

// Páginas montadas à mão com o que o SIGAA real não mostrou nas fixtures:
// campos faltando, linhas fora de ordem, ênfase sem código, grupos com o
// mesmo nome. A extensão precisa ler o que der, sem quebrar.

const doc = (html: string) =>
  new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')

const courses = catalog as SigaaCourse[]

const odd = doc(`
  <table class="formulario"><tbody>
    <tr><th>Código:</th><td>2020.1</td></tr>
    <tr><th>Matriz Curricular:</th><td>CURSO X - SOBRAL - Presencial</td></tr>
    <tr><th>Período Letivo de Entrada em Vigor:</th><td>2020 . 1</td></tr>
    <tr><th>Município de funcionamento:</th><td>SOBRAL - CE</td></tr>
    <tr><th>Carga Horária:</th><td><table><tr>
      <th>Total Mínima</th><td>3000</td><th>Total Máxima</th><td>3600</td>
    </tr></table></td></tr>
    <tr><th>Ênfases:</th><td>Sem exigências ou restrições.</td></tr>
    <tr><td>linha sem rótulo</td></tr>
  </tbody></table>
  <table class="subFormulario"><caption>Componentes Obrigatórios</caption><tbody>
    <tr class="componentes"><td>AA0001</td><td>SEM O FORMATO DE SEMPRE</td></tr>
    <tr class="tituloRelatorio"><td>Sem número</td></tr>
    <tr class="componentes"><td>AA0002</td><td>OUTRA - 64h (4cr) - 1 período letivo</td></tr>
  </tbody></table>
  <table class="subFormulario"><caption>Grupos de Componentes Específicos</caption><tbody>
    <tr class="componentes"><td>AA0001 - ANTES DE TODO GRUPO</td></tr>
    <tr><td>CH Mínima Exigida:10 hrs.</td></tr>
    <tr class="header"><td>GRUPO</td></tr>
    <tr class="componentes"><td>AA0001 - X</td></tr>
    <tr><td>CH Mínima Exigida:10 hrs.</td></tr>
    <tr><td>Linha que não é limite</td></tr>
    <tr class="header"><td>GRUPO</td></tr>
    <tr class="componentes"><td>AA0002 - Y</td></tr>
  </tbody></table>
  <table class="subFormulario"><caption>Currículos de Ênfase</caption><tbody>
    <tr class="componentes"><td>AA0001 - ANTES DE TODA ÊNFASE</td><td>Optativa (Ênfase)</td></tr>
    <tr><td>CH Obrigatória (Ênfase):0hrs.</td></tr>
    <tr class="header"><td>ÊNFASE SEM CÓDIGO</td></tr>
    <tr class="componentes"><td>AA0002 - Y</td><td>Obrigatória (Ênfase)</td></tr>
  </tbody></table>
  <table class="subFormulario"><caption>Tabela que a extensão não conhece</caption></table>
`)

describe('página incompleta', () => {
  const page = readCurriculumPage(odd)!
  // Sem os prazos de conclusão o schema recusa a EC; aqui eles são dados
  const valid = {
    ...page,
    header: { ...page.header, minPeriods: 1, avgPeriods: 1, maxPeriods: 1 },
  }

  it('lê o cabeçalho com os campos que existem', () => {
    expect(page.header).toMatchObject({
      code: '2020.1',
      effectiveTerm: '2020.1',
      unitName: null,
      minTotalHours: 3000,
      maxTotalHours: 3600,
      mandatoryHours: 0,
      minPeriods: 0,
      periodMinHours: 0,
      minEmphases: null,
      maxEmphases: null,
    })
  })

  it('lê componente sem o título no formato de sempre', () => {
    expect(page.components[0]).toMatchObject({
      code: 'AA0001',
      name: 'SEM O FORMATO DE SEMPRE',
      semester: null,
      workloadHours: 0,
      credits: 0,
      typeLabel: '',
      prerequisitesText: '',
    })
    expect(page.components[1]?.semester).toBeNull()
  })

  it('ignora linhas de grupo e ênfase antes do primeiro cabeçalho', () => {
    expect(page.groups.map((group) => group.members)).toEqual([
      ['AA0001'],
      ['AA0002'],
    ])
    expect(page.groups[0]?.minHours).toBe(10)
    expect(page.emphases).toEqual([
      {
        sigaaCode: '',
        name: 'ÊNFASE SEM CÓDIGO',
        mandatoryHours: null,
        minOptativeHours: null,
        members: [{ code: 'AA0002', natureLabel: 'Obrigatória (Ênfase)' }],
        groups: [],
      },
    ])
  })

  it('gera chaves únicas e ênfase sem código', () => {
    const { data } = toCurriculumImport(valid, {
      course: { sigaaId: '1', name: 'Curso X', recognition: 'MANUAL' },
      curriculumSigaaId: null,
      extractedAt: '2026-11-01T12:00:00Z',
      url: null,
    })
    expect(
      data?.branches.map(({ key, sigaaCode }) => ({ key, sigaaCode })),
    ).toEqual([
      { key: 'emphasis-enfase-sem-codigo', sigaaCode: null },
      { key: 'group-grupo', sigaaCode: null },
      { key: 'group-grupo-2', sigaaCode: null },
    ])
  })

  it('não gera o JSON sem os prazos de conclusão', () => {
    const result = toCurriculumImport(page, {
      course: { sigaaId: '1', name: 'Curso X', recognition: 'MANUAL' },
      curriculumSigaaId: null,
      extractedAt: '2026-11-01T12:00:00Z',
      url: null,
    })
    expect(result.data).toBeNull()
    expect(result.issues.map((issue) => issue.path.join('.'))).toContain(
      'curriculum.minPeriods',
    )
  })

  it('devolve null sem tabelas de componentes ou sem o resumo', () => {
    expect(
      readCurriculumPage(
        doc(
          '<table class="formulario"></table><table class="subFormulario"><caption>Outra</caption></table>',
        ),
      ),
    ).toBeNull()
    expect(readCurriculumPage(doc('<p>nada</p>'))).toBeNull()
  })
})

describe('tela de busca incompleta', () => {
  it('ignora opções sem curso e resultados sem link', () => {
    const page = readSearchPage(
      doc(`
        <select id="busca:curso">
          <option value="0" selected>-- SELECIONE --</option>
          <option value="abc">CURSO/X - CIDADE</option>
          <option value="10">SEM BARRA</option>
          <option value="11">CURSO/ - CIDADE</option>
        </select>
        <table><caption>Lista de Estruturas Curriculares Encontradas</caption><tbody>
          <tr><td>2020.1</td><td>2020.1</td><td>CURSO - MT</td></tr>
          <tr><td></td></tr>
        </tbody></table>
      `),
    )
    expect(page).toEqual({
      courses: [
        {
          sigaaId: '11',
          name: 'CURSO',
          city: 'CIDADE',
          modality: null,
          unitAcronym: null,
          unitName: null,
        },
      ],
      selectedCourseId: null,
      curricula: [
        {
          code: '2020.1',
          sigaaId: null,
          matrixName: 'CURSO - MT',
          isCurrent: false,
        },
      ],
    })
  })

  it('funciona sem a tabela de resultados', () => {
    expect(
      readSearchPage(doc('<select id="busca:curso"></select>'))?.curricula,
    ).toEqual([])
  })
})

describe('revisão com curso não decidido', () => {
  const read = readCurriculumPage(odd)!
  const page = {
    ...read,
    header: { ...read.header, minPeriods: 1, avgPeriods: 1, maxPeriods: 1 },
  }
  const conversion = toCurriculumImport(page, {
    course: { sigaaId: '1', name: 'Curso X', recognition: 'MANUAL' },
    curriculumSigaaId: null,
    extractedAt: '2026-11-01T12:00:00Z',
    url: null,
  })
  const courseItem = (course: ReturnType<typeof resolveCourse>) =>
    reviewImport({ ...conversion, course }).find((item) => item.id === 'course')

  it('turnos diferentes', () => {
    const course = resolveCourse({
      header: {
        matrixName: 'ADMINISTRAÇÃO - FORTALEZA - Presencial - N',
        unitName: null,
        city: 'FORTALEZA - CE',
      },
      catalog: courses,
      selectedCourseId: null,
    })
    expect(courseItem(course)?.detail).toBe('2 cursos possíveis')
  })

  it('seleção que não bate com o cabeçalho', () => {
    const course = resolveCourse({
      header: {
        matrixName: 'AGRONOMIA - FORTALEZA - Presencial',
        unitName: null,
        city: 'FORTALEZA - CE',
      },
      catalog: courses,
      selectedCourseId: '657484',
    })
    expect(courseItem(course)?.detail).toMatch(/não bate com o cabeçalho/)
  })

  it('nenhum curso parecido', () => {
    const course = resolveCourse({
      header: page.header,
      catalog: [],
      selectedCourseId: null,
    })
    expect(courseItem(course)?.detail).toBe(
      'Nenhum curso do SIGAA corresponde a esta matriz',
    )
  })

  it('usa o singular com um componente', () => {
    const single = toCurriculumImport(
      {
        ...page,
        components: page.components.slice(1),
        groups: [],
        emphases: [],
      },
      {
        course: { sigaaId: '1', name: 'Curso X', recognition: 'MANUAL' },
        curriculumSigaaId: null,
        extractedAt: '2026-11-01T12:00:00Z',
        url: null,
      },
    )
    const course = resolveCourse({
      header: page.header,
      catalog: [],
      selectedCourseId: null,
    })
    expect(
      reviewImport({ ...single, course }).find(
        (item) => item.id === 'components',
      )?.title,
    ).toBe('1 componente em 0 períodos')
  })
})
