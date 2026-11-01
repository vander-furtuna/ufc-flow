import type { SigaaCourse } from '@ufc-flow/academic-core'

// Tela "Busca por Estruturas Curriculares" (lista.jsf antes de abrir uma EC).
// É a única que traz o código do curso: o select tem todos os cursos, e o
// curso escolhido continua marcado depois da busca (D34).

export type SearchPageCurriculum = {
  code: string
  // Id da EC no SIGAA, do link do relatório (jsfcljs(..., 'id,658760'))
  sigaaId: string | null
  matrixName: string
  isCurrent: boolean
}

export type SearchPage = {
  courses: SigaaCourse[]
  selectedCourseId: string | null
  curricula: SearchPageCurriculum[]
}

const clean = (text: string | null | undefined) =>
  (text ?? '').replace(/\s+/g, ' ').trim()

// "ENGENHARIA DE COMPUTAÇÃO/CUFCSOBRAL - SOBRAL". O nome pode ter barra
// ("PSICOLOGIA/CCGPSIC - SOBRAL/CUFCSOBRAL - SOBRAL"), por isso a última.
export function parseCourseOption(
  value: string,
  text: string,
): SigaaCourse | null {
  const label = clean(text)
  const slash = label.lastIndexOf('/')
  if (!/^\d+$/.test(value) || value === '0' || slash < 0) return null
  const [unitAcronym = '', ...city] = label.slice(slash + 1).split(' - ')
  return {
    sigaaId: value,
    name: label.slice(0, slash).trim(),
    city: city.join(' - ').trim(),
    modality: null,
    unitAcronym: unitAcronym.trim() || null,
    unitName: null,
  }
}

export function readSearchPage(doc: Document): SearchPage | null {
  const select = doc.querySelector<HTMLSelectElement>(
    'select[id="busca:curso"]',
  )
  if (!select) return null

  const options = Array.from(select.querySelectorAll('option'))
  const courses = options
    .map((option) => parseCourseOption(option.value, option.textContent))
    .filter((course): course is SigaaCourse => course !== null)
  const selected = options.find((option) => option.hasAttribute('selected'))

  const results = Array.from(doc.querySelectorAll('table')).find((table) =>
    clean(table.querySelector('caption')?.textContent).startsWith(
      'Lista de Estruturas Curriculares',
    ),
  )
  const curricula = Array.from(results?.querySelectorAll('tbody > tr') ?? [])
    .map((row) => {
      const cells = row.querySelectorAll(':scope > td')
      const matrix = cells[2]
      const link = row.querySelector('a[onclick*="relatorio"]')
      return {
        code: clean(cells[0]?.textContent),
        sigaaId:
          /,id,(\d+)'/.exec(link?.getAttribute('onclick') ?? '')?.[1] ?? null,
        matrixName: clean((matrix?.textContent ?? '').replace('(Vigente)', '')),
        isCurrent: /\(Vigente\)/.test(matrix?.textContent ?? ''),
      }
    })
    .filter((item) => item.code !== '')

  return {
    courses,
    selectedCourseId:
      selected && /^\d+$/.test(selected.value) && selected.value !== '0'
        ? selected.value
        : null,
    curricula,
  }
}
