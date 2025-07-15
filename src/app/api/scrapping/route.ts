import { randomUUID } from 'node:crypto'

import { type Cheerio, load } from 'cheerio'
import type { Element } from 'domhandler'
import fetchCookie from 'fetch-cookie'
import fetch from 'node-fetch'
import { CookieJar } from 'tough-cookie'

import type {
  ClassSection,
  DateRange,
  ScheduleTime,
  SubjectGroup,
} from '@/types/class'

// --- Helpers de parsing ---
function parseInstructor($link: Cheerio<Element>) {
  const href = $link.attr('href') || ''
  const params = new URLSearchParams(href.split('?')[1] || '')
  return {
    name: $link.text().trim(),
    siape: params.get('siape') || '',
    profileUrl: href,
  }
}

function parseSchedule(rawHtml: string): ScheduleTime[] {
  return rawHtml
    .split('<br>')
    .filter((line) => !line.startsWith('('))
    .map((line) => {
      const [day, times] = line.trim().split(' ')
      const [startTime, endTime] = times.split('-')
      return { id: randomUUID(), day, startTime, endTime }
    })
}

const DATE_RANGE_REGEX = /\((\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})\)/

function parseValidity(rawHtml: string): DateRange {
  const m = rawHtml.match(DATE_RANGE_REGEX)
  if (!m) throw new Error(`Invalid date range: ${rawHtml}`)
  const toIso = (d: string) => d.split('/').reverse().join('-')
  return { startDate: toIso(m[1]), endDate: toIso(m[2]) }
}

function parseTable(
  $: ReturnType<typeof load>,
  table: Element,
): ClassSection[] {
  const $table = $(table)
  const header = $table.find('thead td.subListagem > a').text().trim()
  const [code, name] = header.split(' - ').map((s) => s.trim())

  return $table
    .find('tbody tr')
    .toArray()
    .map((tr) => {
      const $tr = $(tr)
      const term = $tr.find('td.anoPeriodo').text().trim()
      const sectionId = $tr.find('td').eq(1).text().trim()
      const $link = $tr.find('td.nome > a')
      const instructor = parseInstructor($link)
      const reservedSeats = Number($tr.find('td.colVagas').text().trim())
      const rawHorario = $tr.find('td.horario').html() || ''

      return {
        id: randomUUID(),
        term,
        sectionId,
        instructor,
        reservedSeats,
        schedule: parseSchedule(rawHorario),
        validity: parseValidity(rawHorario),
        code,
        name,
      }
    })
}

// --- Server Action ---
export async function POST(req: Request): Promise<Response> {
  const { year, semester } = await req.json()

  const baseURL = 'https://si3.ufc.br/sigaa/'
  const TURMAS_PATH = 'public/curso/turmas.jsf?lc=pt_BR&id=657484'

  // Cria um cookie jar e um fetch com gerenciamento de cookies
  const jar = new CookieJar()
  const fetchWithCookies = fetchCookie(fetch, jar)

  // 1) GET inicial para viewState e cookies
  const initRes = await fetchWithCookies(baseURL + TURMAS_PATH)
  const pageHtml = await initRes.text()
  const $init = load(pageHtml)
  const viewState = $init('input[name="javax.faces.ViewState"]').val() as string

  // 2) POST para buscar turmas
  const formData = new URLSearchParams({
    form: 'form',
    'form:lc': 'pt_BR',
    'form:id': '657484',
    'form:inputAno': year,
    'form:inputPeriodo': semester,
    'form:j_id_jsp_9230792_38': 'pt_BR',
    'form:j_id_jsp_9230792_39': '657484',
    'form:j_id_jsp_9230792_40': 'Buscar',
    'javax.faces.ViewState': viewState,
  })

  const postRes = await fetchWithCookies(baseURL + TURMAS_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  })
  const postHtml = await postRes.text()

  // 3) Carrega HTML de resposta e seleciona tabelas
  const $ = load(postHtml)
  const tables = $('#turmasAbertas > table.listagem').toArray()

  // 4) Parse e agrupamento
  const flat = tables.flatMap((t) => parseTable($, t))
  const map = new Map<string, SubjectGroup>()

  for (const section of flat) {
    const key = section.code
    if (!map.has(key)) {
      map.set(key, {
        code: key,
        name: section.name,
        classes: [],
      })
    }
    map.get(key)!.classes.push(section)
  }

  return Response.json(Array.from(map.values()))
}
