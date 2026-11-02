import { Injectable } from '@nestjs/common'
import { load, type CheerioAPI } from 'cheerio'

import type { SigaaSectionSource } from '../../domain/ports'
import { parseSigaaSchedule } from '../../domain/schedule-text'
import type { InstructorRef, ScrapedSection } from '../../domain/section'

const SIGAA_URL = 'https://si3.ufc.br/sigaa/public/curso/turmas.jsf'

const clean = (text: string) => text.replace(/\s+/g, ' ').trim()

// Cada disciplina é uma tabela: o cabeçalho traz "CÓDIGO - NOME" e cada
// linha é uma turma, com docentes (link com o SIAPE), vagas reservadas para
// o curso e o horário em linhas separadas por <br>
export function parseSigaaSections(html: string): ScrapedSection[] {
  const $ = load(html)
  return $('#turmasAbertas > table.listagem')
    .toArray()
    .flatMap((table) => {
      const header = clean($(table).find('thead td.subListagem > a').text())
      const separator = header.indexOf(' - ')
      if (separator < 0) return []
      const subjectCode = header.slice(0, separator)
      const subjectName = header.slice(separator + 3)
      return $(table)
        .find('tbody tr')
        .toArray()
        .flatMap((row): ScrapedSection[] => {
          const cells = $(row).find('td')
          const sectionCode = clean(cells.eq(1).text())
          if (!sectionCode) return []
          const schedule = $(row).find('td.horario').first()
          schedule.find('br').replaceWith('\n')
          return [
            {
              subjectCode,
              subjectName,
              sectionCode,
              instructors: parseInstructors($, row),
              reservedSeats:
                Number(clean($(row).find('td.colVagas').text())) || 0,
              ...parseSigaaSchedule(schedule.text()),
            },
          ]
        })
    })
}

function parseInstructors(
  $: CheerioAPI,
  row: Parameters<CheerioAPI>[0],
): InstructorRef[] {
  return (
    $(row)
      .find('td.nome a[href*="siape="]')
      .toArray()
      .map((link) => {
        const href = $(link).attr('href') ?? ''
        return {
          siape: /siape=(\d+)/.exec(href)?.[1] ?? '',
          name: clean($(link).text()),
          profileUrl: href,
        }
      })
      // O SIGAA repete o docente quando ele dá mais de um horário
      .filter(
        (instructor, index, all) =>
          instructor.siape !== '' &&
          all.findIndex((other) => other.siape === instructor.siape) === index,
      )
  )
}

// Campos do formulário JSF como a página os entrega (os ids j_id_jsp mudam
// entre versões do SIGAA), com o semestre pedido e o botão Buscar
function formFields($: CheerioAPI, year: number, period: number) {
  const fields = new URLSearchParams()
  $('form#form input, form#form select').each((_, element) => {
    const name = $(element).attr('name')
    const type = $(element).attr('type')
    if (!name || type === 'submit' || type === 'button') return
    fields.set(name, String($(element).val() ?? ''))
  })
  const submit = $('form#form input[type="submit"]').filter(
    (_, element) => $(element).attr('value') === 'Buscar',
  )
  const submitName = submit.attr('name')
  if (submitName) fields.set(submitName, 'Buscar')
  fields.set('form:inputAno', String(year))
  fields.set('form:inputPeriodo', String(period))
  return fields
}

async function decode(response: Response) {
  const charset =
    /charset=([\w-]+)/i.exec(response.headers.get('content-type') ?? '')?.[1] ??
    'windows-1252'
  return new TextDecoder(charset).decode(await response.arrayBuffer())
}

// Página pública de turmas (sem login): GET para o cookie e o ViewState, POST
// do formulário com o semestre
@Injectable()
export class HttpSigaaSectionSource implements SigaaSectionSource {
  async fetch(sigaaCourseId: string, year: number, period: number) {
    const url = `${SIGAA_URL}?lc=pt_BR&id=${encodeURIComponent(sigaaCourseId)}`
    const first = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    if (!first.ok) throw new Error(`SIGAA respondeu ${first.status}`)
    const cookie = first.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ')
    const fields = formFields(load(await decode(first)), year, period)
    if (!fields.has('javax.faces.ViewState')) {
      throw new Error('A página de turmas do SIGAA veio sem o formulário')
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        cookie,
      },
      body: fields,
      signal: AbortSignal.timeout(60_000),
    })
    if (!response.ok) throw new Error(`SIGAA respondeu ${response.status}`)
    const html = await decode(response)
    if (html.includes('turmasAbertas')) return parseSigaaSections(html)
    // Semestre sem turmas volta só com o formulário de busca, sem mensagem.
    // Sem nem o formulário, o layout mudou: falha, para não marcar todas as
    // turmas como removidas
    if (html.includes('form:inputAno')) return []
    throw new Error('A página de turmas do SIGAA veio sem a lista')
  }
}
