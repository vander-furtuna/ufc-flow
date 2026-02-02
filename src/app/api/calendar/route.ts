import { randomUUID } from 'node:crypto'
import { load } from 'cheerio'
import type { Element } from 'domhandler'
import fetchCookie from 'fetch-cookie'
import fetch from 'node-fetch'
import { CookieJar } from 'tough-cookie'
import type { AcademicEvent, MonthGroup } from '@/types/calendar'

const MONTH_MAP: Record<string, number> = {
  Janeiro: 0,
  Fevereiro: 1,
  Março: 2,
  Abril: 3,
  Maio: 4,
  Junho: 5,
  Julho: 6,
  Agosto: 7,
  Setembro: 8,
  Outubro: 9,
  Novembro: 10,
  Dezembro: 11,
}

// --- Helpers de Parsing ---

function parseEventRow(
  $: ReturnType<typeof load>,
  tr: Element,
  year: number,
  monthIndex: number,
): AcademicEvent[] {
  const $row = $(tr)
  const cells = $row.find('td.cell')
  const events: AcademicEvent[] = []

  if (cells.length >= 2) {
    // Normaliza espaços (remove &nbsp; e quebras de linha extras do HTML)
    const dateText = cells.eq(0).text().replace(/\s+/g, ' ').trim()
    const description = cells.eq(1).text().replace(/\s+/g, ' ').trim()

    // Tenta identificar categorias extras na célula de data (ex: PG, EAD)
    let category = 'Geral'
    if (dateText.includes('(PG)')) category = 'Pós-Graduação'
    if (dateText.includes('(EAD)')) category = 'EAD'

    // Regex ajustado para pegar números no início da string, ignorando sufixos como (PG)
    // Ex: "12 a 21" ou "28 a 30 (EAD)"
    const rangeMatch = dateText.match(/^(\d+)\s+a\s+(\d+)/)
    // Ex: "01" ou "22 (PG)"
    const singleMatch = dateText.match(/^(\d+)/)

    if (rangeMatch) {
      const startDay = parseInt(rangeMatch[1])
      const endDay = parseInt(rangeMatch[2])
      const rangeId = randomUUID()

      for (let day = startDay; day <= endDay; day++) {
        events.push({
          id: randomUUID(),
          date: new Date(year, monthIndex, day).toISOString(),
          originalDateString: dateText,
          description,
          isRange: true,
          isRangeStart: day === startDay,
          rangeId,
          category,
        })
      }
    } else if (singleMatch) {
      const day = parseInt(singleMatch[1])
      events.push({
        id: randomUUID(),
        date: new Date(year, monthIndex, day).toISOString(),
        originalDateString: dateText,
        description,
        isRange: false,
        category,
      })
    }
  }

  return events
}

function groupEventsByMonth(events: AcademicEvent[]): MonthGroup[] {
  const groups: Record<string, MonthGroup> = {}

  events.forEach((event) => {
    // Na visualização em lista agrupada, ignoramos os dias subsequentes de um range
    // para não poluir a tela (ex: mostra só o dia 12 num range 12-21)
    if (event.isRange && !event.isRangeStart) return

    const dateObj = new Date(event.date)
    const key = `${dateObj.getMonth()}-${dateObj.getFullYear()}`

    if (!groups[key]) {
      groups[key] = {
        monthName: dateObj.toLocaleString('pt-BR', { month: 'long' }),
        year: dateObj.getFullYear(),
        events: [],
      }
    }
    groups[key].events.push(event)
  })

  return Object.values(groups)
}

// --- Rota Principal (Server Action) ---

export async function GET(req: Request): Promise<Response> {
  // URL baseada no arquivo que você enviou
  const { searchParams } = new URL(req.url)
  const queryYear = searchParams.get('year')

  // Define o ano atual como fallback se nenhum for enviado
  const currentYear = new Date().getFullYear().toString()
  const yearToFetch = queryYear || currentYear

  // Validação simples (garante que é um número de 4 dígitos)
  if (!/^\d{4}$/.test(yearToFetch)) {
    return new Response(
      JSON.stringify({ error: 'Ano inválido. Use o formato YYYY.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  // 2. Construção da URL Dinâmica
  const CALENDAR_URL = `https://www.ufc.br/calendario-universitario/${yearToFetch}`

  const jar = new CookieJar()
  const fetchWithCookies = fetchCookie(fetch, jar)

  try {
    const res = await fetchWithCookies(CALENDAR_URL)
    const html = await res.text()

    // Se quiser testar com o HTML local (mock), descomente a linha abaixo e passe o HTML string:
    // const html = SEU_HTML_STRING_AQUI;

    const $ = load(html)
    const allEvents: AcademicEvent[] = []

    // 1. Seleciona apenas os H3 dentro da div de calendários para evitar lixo
    const headers = $('.c-calendarios h3').toArray()

    headers.forEach((header) => {
      const $header = $(header)
      // Ex: "Janeiro de 2026"
      const title = $header.text().replace(/\s+/g, ' ').trim()

      const parts = title.split(' ')
      const monthName = parts[0]
      const yearStr = parts[parts.length - 1]

      if (!monthName || !yearStr || !MONTH_MAP.hasOwnProperty(monthName)) return

      const monthIndex = MONTH_MAP[monthName]
      const year = parseInt(yearStr)

      // 2. Lógica para encontrar a tabela imediatamente após o header
      let $nextSibling = $header.next()

      // Pula elementos vazios ou de texto até achar a tabela
      // O HTML tem <div class="obs"> antes dos meses, mas a tabela vem logo após o H3
      while ($nextSibling.length && $nextSibling.prop('tagName') !== 'TABLE') {
        $nextSibling = $nextSibling.next()
      }

      if ($nextSibling.length && $nextSibling.prop('tagName') === 'TABLE') {
        // Seleciona as linhas com classe 'item' (conforme o HTML enviado)
        const rows = $nextSibling.find('tbody.listras tr.item').toArray()

        rows.forEach((row) => {
          const parsedEvents = parseEventRow($, row, year, monthIndex)
          allEvents.push(...parsedEvents)
        })
      }
    })

    // Ordenação cronológica
    allEvents.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    const groupedData = groupEventsByMonth(allEvents)

    return Response.json(groupedData)
  } catch (error) {
    console.error('Erro ao processar calendário:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch calendar data' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
