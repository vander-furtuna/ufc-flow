import { normalizeSearchText } from '@ufc-flow/academic-core'

// Leitura da página "Dados da Estrutura Curricular" do SIGAA, sem
// interpretar: os textos de tipo, natureza e requisitos vão como estão, e a
// conversão para o CurriculumImportV1 fica em to-curriculum-import.ts.

export type CurriculumPageHeader = {
  code: string
  effectiveTerm: string
  matrixName: string
  unitName: string | null
  city: string
  minTotalHours: number
  maxTotalHours: number | null
  mandatoryHours: number
  optativeHours: number
  extensionHours: number
  specificActivityHours: number
  maxFreeOptativeHours: number
  minPeriods: number
  avgPeriods: number
  maxPeriods: number
  periodMinHours: number
  periodAvgHours: number
  periodMaxHours: number
  minEmphases: number | null
  maxEmphases: number | null
}

export type PageComponent = {
  code: string
  name: string
  table: 'MANDATORY' | 'OPTATIVE'
  semester: number | null
  durationTerms: 1 | 2
  workloadHours: number
  credits: number
  theoryHours: number
  labHours: number
  eadHours: number
  extensionHours: number
  typeLabel: string
  natureLabel: string
  prerequisitesText: string
  equivalencesText: string
  corequisitesText: string
}

export type PageGroup = {
  name: string
  minHours: number | null
  maxHours: number | null
  minComponents: number | null
  maxComponents: number | null
  members: string[]
}

export type PageEmphasis = {
  sigaaCode: string
  name: string
  mandatoryHours: number | null
  minOptativeHours: number | null
  members: { code: string; natureLabel: string }[]
  groups: PageGroup[]
}

export type CurriculumPage = {
  header: CurriculumPageHeader
  components: PageComponent[]
  groups: PageGroup[]
  emphases: PageEmphasis[]
}

const clean = (text: string) => text.replace(/\s+/g, ' ').trim()

const label = (text: string) => normalizeSearchText(clean(text))

// Texto de um nó com espaço entre os nós filhos. Nas páginas salvas do
// SIGAA não há espaço entre as tags (<acronym>A</acronym>E<acronym>B</acronym>),
// e o textContent colaria código e operador.
function spacedText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  return Array.from(node.childNodes, spacedText).join(' ')
}

const textOf = (node: Node | null | undefined) =>
  node ? clean(spacedText(node)) : ''

// Célula de pré-requisito, co-requisito ou equivalência, no formato que o
// parseRequirement do academic-core lê: "( A E ( B OU C ) )"
export const requirementText = (cell: Element) => textOf(cell)

const firstNumber = (text: string) => {
  const match = /\d+/.exec(text)
  return match ? Number(match[0]) : null
}

const children = (element: Element, selector: string) =>
  Array.from(element.querySelectorAll(`:scope > ${selector}`))

const rowsOf = (table: Element) => [
  ...children(table, 'tr'),
  ...children(table, 'tbody > tr'),
  ...children(table, 'thead > tr'),
]

// Valor de um th dentro de uma tabela aninhada ("Mínimo 7 Médio 10 ...")
function nestedValue(cell: Element, header: string) {
  const th = Array.from(cell.querySelectorAll('th')).find(
    (item) => label(item.textContent ?? '') === label(header),
  )
  return firstNumber(th?.nextElementSibling?.textContent ?? '')
}

function readHeader(summary: Element): CurriculumPageHeader {
  const fields = new Map<string, Element>()
  for (const row of rowsOf(summary)) {
    const th = row.querySelector(':scope > th')
    const td = row.querySelector(':scope > td')
    if (th && td) fields.set(label(th.textContent ?? ''), td)
  }
  const field = (name: string) => fields.get(label(name))
  const text = (name: string) => textOf(field(name))
  const number = (name: string) => firstNumber(text(name)) ?? 0

  const totals = field('Carga Horária:')
  const deadlines = field('Prazos para Conclusão em Períodos Letivos:')
  const perPeriod = field('Carga Horária por Período Letivo:')
  const emphases = /Exigido \((\d+)\), Permitido \((\d+)\)/.exec(
    text('Ênfases:'),
  )
  const value = (cell: Element | undefined, header: string) =>
    cell ? nestedValue(cell, header) : null

  return {
    code: text('Código:'),
    effectiveTerm: text('Período Letivo de Entrada em Vigor:').replace(
      /\s+/g,
      '',
    ),
    matrixName: text('Matriz Curricular:'),
    unitName: text('Unidade de Vinculação:') || null,
    city: text('Município de funcionamento:'),
    minTotalHours: value(totals, 'Total Mínima') ?? 0,
    maxTotalHours: value(totals, 'Total Máxima'),
    mandatoryHours: number('Carga Horária Obrigatória:'),
    optativeHours: number('Carga Horária Optativa Minima:'),
    extensionHours: number('Carga Horária de Extensão:'),
    specificActivityHours: number(
      'Carga Horária Obrigatória de Atividade Acadêmica Específica:',
    ),
    maxFreeOptativeHours: number(
      'Carga Horária Máxima de Componentes Curriculares Optativos Livres:',
    ),
    minPeriods: value(deadlines, 'Mínimo') ?? 0,
    avgPeriods: value(deadlines, 'Médio') ?? 0,
    maxPeriods: value(deadlines, 'Máximo') ?? 0,
    periodMinHours: value(perPeriod, 'Mínima') ?? 0,
    periodAvgHours: value(perPeriod, 'Média') ?? 0,
    periodMaxHours: value(perPeriod, 'Máxima') ?? 0,
    minEmphases: emphases ? Number(emphases[1]) : null,
    maxEmphases: emphases ? Number(emphases[2]) : null,
  }
}

const TITLE_PATTERN =
  /^(.*?) - (\d+)h \((\d+)cr\) -\s*(\d+) per[íi]odos? letivos?/

function readComponents(table: Element, kind: PageComponent['table']) {
  const components: PageComponent[] = []
  let semester: number | null = null

  for (const row of rowsOf(table)) {
    if (row.classList.contains('tituloRelatorio')) {
      const match = /(\d+)\s*º?\s*Semestre/i.exec(row.textContent ?? '')
      semester = match ? Number(match[1]) : null
      continue
    }
    if (!row.classList.contains('componentes')) continue

    const cells = children(row, 'td')
    const cellText = (index: number) => textOf(cells[index])
    const title = TITLE_PATTERN.exec(cellText(1))
    const details = cellText(2)
    const hours = (part: string) =>
      Number(new RegExp(`(\\d+)h ${part}`).exec(details)?.[1] ?? 0)

    components.push({
      code: cellText(0),
      name: title?.[1] ?? cellText(1),
      table: kind,
      semester,
      durationTerms: title?.[4] === '2' ? 2 : 1,
      workloadHours: Number(title?.[2] ?? 0),
      credits: Number(title?.[3] ?? 0),
      theoryHours: hours('aula'),
      labHours: hours('lab'),
      eadHours: hours('ead'),
      extensionHours: hours('ext'),
      typeLabel: cellText(3),
      natureLabel: cellText(4),
      prerequisitesText: cells[5] ? requirementText(cells[5]) : '',
      equivalencesText: cells[6] ? requirementText(cells[6]) : '',
      corequisitesText: cells[7] ? requirementText(cells[7]) : '',
    })
  }
  return components
}

// "CH Mínima Exigida:256 hrs." e "--- hrs." (sem limite)
const limitOf = (text: string, name: string) =>
  label(text).startsWith(label(name)) ? firstNumber(text) : undefined

const memberCode = (text: string) => clean(text).split(' - ')[0] ?? ''

function readGroups(table: Element): PageGroup[] {
  const groups: PageGroup[] = []
  let current: PageGroup | null = null

  for (const row of rowsOf(table)) {
    const text = textOf(row)
    if (row.classList.contains('tituloRelatorio')) continue
    if (row.classList.contains('header')) {
      current = {
        name: text,
        minHours: null,
        maxHours: null,
        minComponents: null,
        maxComponents: null,
        members: [],
      }
      groups.push(current)
      continue
    }
    if (!current) continue
    if (row.classList.contains('componentes')) {
      current.members.push(memberCode(text))
      continue
    }
    current.minHours = limitOf(text, 'CH Mínima Exigida') ?? current.minHours
    current.maxHours = limitOf(text, 'CH Máxima Permitida') ?? current.maxHours
    current.minComponents =
      limitOf(text, 'Qtd. de Componentes Mínima Exigida') ??
      current.minComponents
    current.maxComponents =
      limitOf(text, 'Qtd. de Componentes Máxima Permitida') ??
      current.maxComponents
  }
  return groups
}

function readEmphases(table: Element): PageEmphasis[] {
  const emphases: PageEmphasis[] = []
  let current: PageEmphasis | null = null

  for (const row of rowsOf(table)) {
    const text = textOf(row)
    if (row.classList.contains('tituloRelatorio')) continue
    if (row.classList.contains('header')) {
      // "2023.1E2 - EIXO DE GESTÃO E EMPREENDEDORISMO"; sem código, só o nome
      const [code = '', ...name] = text.split(' - ')
      const hasCode = name.length > 0
      current = {
        sigaaCode: hasCode ? code.trim() : '',
        name: hasCode ? name.join(' - ').trim() : text,
        mandatoryHours: null,
        minOptativeHours: null,
        members: [],
        groups: [],
      }
      emphases.push(current)
      continue
    }
    if (!current) continue

    const nested = row.querySelector('table.subFormulario')
    if (nested) {
      current.groups.push(...readGroups(nested))
      continue
    }
    if (row.classList.contains('componentes')) {
      const cells = children(row, 'td')
      current.members.push({
        code: memberCode(textOf(cells[0])),
        natureLabel: textOf(cells[1]),
      })
      continue
    }
    current.mandatoryHours =
      limitOf(text, 'CH Obrigatória (Ênfase)') ?? current.mandatoryHours
    current.minOptativeHours =
      limitOf(text, 'CH Optativa Mínima (Ênfase)') ?? current.minOptativeHours
  }
  return emphases
}

// Lê a página da estrutura curricular; null se o documento não é ela
export function readCurriculumPage(doc: Document): CurriculumPage | null {
  const summary = doc.querySelector('table.formulario')
  const tables = Array.from(doc.querySelectorAll('table.subFormulario'))
  if (!summary || tables.length === 0) return null

  const page: CurriculumPage = {
    header: readHeader(summary),
    components: [],
    groups: [],
    emphases: [],
  }

  for (const table of tables) {
    // Grupos dentro de ênfases são lidos junto com a ênfase
    if (table.parentElement?.closest('table.subFormulario')) continue
    const caption = label(
      table.querySelector(':scope > caption')?.textContent ?? '',
    )
    if (caption.startsWith('componentes obrigatorios')) {
      page.components.push(...readComponents(table, 'MANDATORY'))
    } else if (caption.startsWith('componentes optativos')) {
      page.components.push(...readComponents(table, 'OPTATIVE'))
    } else if (caption.startsWith('grupos de componentes especificos')) {
      page.groups.push(...readGroups(table))
    } else if (caption.startsWith('curriculos de enfase')) {
      page.emphases.push(...readEmphases(table))
    }
  }

  return page.components.length > 0 ? page : null
}
