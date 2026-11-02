import type { SigaaCourse } from '@ufc-flow/academic-core'
import { Injectable } from '@nestjs/common'
import { load } from 'cheerio'

import type { SigaaCourseSource } from '../../domain/ports'

export const SIGAA_COURSE_LIST_URL =
  'https://si3.ufc.br/sigaa/public/curso/lista.jsf?nivel=G&aba=p-graduacao'

const clean = (text: string) => text.replace(/\s+/g, ' ').trim()

// Lê a tabela da lista pública de cursos de graduação. Cada unidade abre com
// uma linha de cabeçalho ("CUFCSOBRAL - CAMPUS DA UFC EM SOBRAL") e o código
// do curso está no link do portal (portal.jsf?id=). O coordenador não é lido.
export function parseSigaaCourseList(html: string): SigaaCourse[] {
  const $ = load(html)
  const courses: SigaaCourse[] = []
  let unit: string | null = null

  $('table.listagem tbody tr').each((_, row) => {
    const $row = $(row)
    const link = $row.find('a[href*="portal.jsf?id="]').attr('href')
    if (!link) {
      const text = clean($row.text())
      if (text) unit = text
      return
    }
    const sigaaId = /id=(\d+)/.exec(link)?.[1]
    const cells = $row.find('td')
    if (!sigaaId) return
    const separator = unit?.indexOf(' - ') ?? -1
    courses.push({
      sigaaId,
      name: clean(cells.eq(0).text()),
      city: clean(cells.eq(1).text()),
      modality: /dist/i.test(cells.eq(2).text()) ? 'DISTANCE' : 'IN_PERSON',
      unitAcronym: unit && separator > 0 ? unit.slice(0, separator) : null,
      unitName: unit && separator > 0 ? unit.slice(separator + 3) : unit,
    })
  })
  return courses
}

// Busca a lista no SIGAA (sem login). A página vem em windows-1252.
@Injectable()
export class HttpSigaaCourseSource implements SigaaCourseSource {
  async fetchAll(): Promise<SigaaCourse[]> {
    const response = await fetch(SIGAA_COURSE_LIST_URL, {
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) {
      throw new Error(`SIGAA respondeu ${response.status} na lista de cursos`)
    }
    const html = new TextDecoder('windows-1252').decode(
      await response.arrayBuffer(),
    )
    const courses = parseSigaaCourseList(html)
    // Página sem nenhum curso é mudança de layout ou erro: não apaga o
    // catálogo por causa disso
    if (courses.length === 0) {
      throw new Error('A lista de cursos do SIGAA veio vazia')
    }
    return courses
  }
}
