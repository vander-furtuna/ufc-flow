import { normalizeSearchText } from '../search/normalize-search'

export type SigaaCourseModality = 'IN_PERSON' | 'DISTANCE'

// Curso da lista pública do SIGAA. O select da tela de busca de estruturas
// traz só código, nome, sigla da unidade e cidade, por isso modalidade e
// nome da unidade podem faltar.
export type SigaaCourse = {
  sigaaId: string
  name: string
  city: string
  modality: SigaaCourseModality | null
  unitAcronym: string | null
  unitName: string | null
}

// Campos de "Dados da Estrutura Curricular", como aparecem na página
export type CurriculumPageHeader = {
  // "ENGENHARIA DE COMPUTAÇÃO - SOBRAL - Presencial - MT - BACHARELADO"
  matrixName: string
  // "CAMPUS DA UFC EM SOBRAL (11.00.01.28)"
  unitName: string | null
  // "SOBRAL - CE"
  city: string | null
}

export type SigaaCourseMatch =
  | { status: 'MATCHED'; course: SigaaCourse; candidates: SigaaCourse[] }
  | {
      status: 'AMBIGUOUS' | 'NOT_FOUND'
      course: null
      candidates: SigaaCourse[]
    }

const normalize = (text: string) =>
  normalizeSearchText(text)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// "ADMINISTRAÇÃO (DIURNO)" casa com a matriz "ADMINISTRAÇÃO - ..."; o turno
// fica para o usuário escolher
const courseName = (course: SigaaCourse) =>
  normalize(course.name.replace(/\s*\([^)]*\)\s*$/, ''))

function modalityOf(matrixName: string): SigaaCourseModality | null {
  const segments = matrixName.split(' - ').map(normalize)
  if (segments.includes('presencial')) return 'IN_PERSON'
  if (segments.includes('a distancia')) return 'DISTANCE'
  return null
}

const cityOf = (city: string) => normalize(city.replace(/\s*-\s*[A-Z]{2}$/, ''))

const unitOf = (unit: string) =>
  normalize(unit.replace(/\s*\([\d.]+\)\s*$/, ''))

// Reconhece o curso de uma estrutura curricular, que não traz o código do
// curso. Filtra pela cidade e pela modalidade, procura o curso cujo nome
// começa a matriz e, no empate, prefere a mesma unidade e depois o nome mais
// longo ("MATEMÁTICA - LICENCIATURA" antes de "MATEMÁTICA"). Sem nenhum
// nome, devolve como candidatos os cursos da mesma cidade (e unidade).
export function matchSigaaCourse(
  header: CurriculumPageHeader,
  catalog: readonly SigaaCourse[],
): SigaaCourseMatch {
  const matrix = normalize(header.matrixName)
  const city = header.city ? cityOf(header.city) : null
  const unit = header.unitName ? unitOf(header.unitName) : null
  const modality = modalityOf(header.matrixName)

  const sameUnit = (list: SigaaCourse[]) => {
    const filtered = list.filter(
      (item) => item.unitName !== null && normalize(item.unitName) === unit,
    )
    return unit !== null && filtered.length > 0 ? filtered : list
  }

  const base = catalog.filter(
    (item) =>
      (city === null || normalize(item.city) === city) &&
      (modality === null ||
        item.modality === null ||
        item.modality === modality),
  )

  const named = sameUnit(
    base.filter((item) => {
      const name = courseName(item)
      return matrix === name || matrix.startsWith(`${name} `)
    }),
  )

  if (named.length === 0) {
    return { status: 'NOT_FOUND', course: null, candidates: sameUnit(base) }
  }

  const longest = Math.max(...named.map((item) => courseName(item).length))
  const best = named.filter((item) => courseName(item).length === longest)
  const [only] = best
  return best.length === 1 && only
    ? { status: 'MATCHED', course: only, candidates: best }
    : { status: 'AMBIGUOUS', course: null, candidates: best }
}
