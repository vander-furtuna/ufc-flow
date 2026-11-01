import type { SigaaCourse } from '@ufc-flow/academic-core'

import { readSearchPage } from '../sigaa/read-search-page'

// O que a extensão guarda da tela de busca para usar na página da estrutura,
// que não tem o código do curso (D34). Fica no sessionStorage do SIGAA: vale
// só nesta aba e some ao fechá-la.
export type SearchCapture = {
  selectedCourseId: string | null
  courses: SigaaCourse[]
  // EC aberta pelo link do relatório
  curriculum: { code: string; sigaaId: string } | null
}

const KEY = 'ufc-flow:search'

const EMPTY: SearchCapture = {
  selectedCourseId: null,
  courses: [],
  curriculum: null,
}

export function readSearchCapture(): SearchCapture {
  try {
    const stored = sessionStorage.getItem(KEY)
    return stored
      ? { ...EMPTY, ...(JSON.parse(stored) as SearchCapture) }
      : EMPTY
  } catch {
    return EMPTY
  }
}

const write = (capture: SearchCapture) =>
  sessionStorage.setItem(KEY, JSON.stringify(capture))

export function captureSearchPage(doc: Document) {
  const page = readSearchPage(doc)
  if (!page) return
  write({
    selectedCourseId: page.selectedCourseId,
    courses: page.courses,
    curriculum: null,
  })
}

// Clique no link "Relatório da Estrutura Curricular" de uma linha
export function captureCurriculumClick(target: Element) {
  const link = target.closest('a[id$="relatorio"]')
  const row = link?.closest('tr')
  const sigaaId = /,id,(\d+)'/.exec(link?.getAttribute('onclick') ?? '')?.[1]
  const code = row?.querySelector('td')?.textContent?.trim()
  if (!sigaaId || !code) return
  write({ ...readSearchCapture(), curriculum: { code, sigaaId } })
}
