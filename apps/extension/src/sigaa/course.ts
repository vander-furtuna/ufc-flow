import {
  matchSigaaCourse,
  type CurriculumPageHeader,
  type SigaaCourse,
  type SigaaCourseMatch,
} from '@ufc-flow/academic-core'
import type { CourseRecognition } from '@ufc-flow/contracts'

const PARTICLES = new Set([
  'a',
  'as',
  'com',
  'da',
  'das',
  'de',
  'do',
  'dos',
  'e',
  'em',
  'na',
  'nas',
  'no',
  'nos',
  'o',
  'os',
  'para',
])

// "ENGENHARIA DE COMPUTAÇÃO" vira "Engenharia de Computação" (D34). O admin
// ajusta siglas e casos raros no Flow.
export function formatCourseName(name: string): string {
  return name
    .toLocaleLowerCase('pt-BR')
    .replace(/\p{L}+/gu, (word, offset: number) =>
      offset > 0 && PARTICLES.has(word)
        ? word
        : word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1),
    )
}

// O catálogo embutido (lista pública, com modalidade e unidade) mais os
// cursos novos que aparecerem no select da tela de busca do SIGAA
export function mergeCatalog(
  embedded: readonly SigaaCourse[],
  fromSelect: readonly SigaaCourse[],
): SigaaCourse[] {
  const known = new Set(embedded.map((item) => item.sigaaId))
  return [...embedded, ...fromSelect.filter((item) => !known.has(item.sigaaId))]
}

export type CourseResolution = {
  course: SigaaCourse | null
  recognition: CourseRecognition | null
  // Opções para o usuário escolher quando não há curso decidido
  candidates: SigaaCourse[]
  match: SigaaCourseMatch
}

// Decide o curso da estrutura aberta (D34): a escolha do usuário, o curso
// selecionado na busca do SIGAA (se o cabeçalho não apontar outro) ou o
// reconhecido pelo cabeçalho.
export function resolveCourse({
  header,
  catalog,
  selectedCourseId,
  manualCourseId = null,
}: {
  header: CurriculumPageHeader
  catalog: readonly SigaaCourse[]
  selectedCourseId: string | null
  manualCourseId?: string | null
}): CourseResolution {
  const find = (id: string | null) =>
    id === null ? undefined : catalog.find((item) => item.sigaaId === id)
  const match = matchSigaaCourse(header, catalog)

  const manual = find(manualCourseId)
  if (manual) {
    return { course: manual, recognition: 'MANUAL', candidates: [], match }
  }

  const selected = find(selectedCourseId)
  if (selected) {
    if (match.course && match.course.sigaaId !== selected.sigaaId) {
      return {
        course: null,
        recognition: null,
        candidates: [selected, match.course],
        match,
      }
    }
    return { course: selected, recognition: 'SELECTED', candidates: [], match }
  }

  return match.course
    ? { course: match.course, recognition: 'MATCHED', candidates: [], match }
    : { course: null, recognition: null, candidates: match.candidates, match }
}
