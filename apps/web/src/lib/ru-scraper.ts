import { randomUUID } from 'node:crypto'
import { load } from 'cheerio'
import {
  DEFAULT_CAMPUS_ID,
  UFC_CAMPUSES,
  type CampusId,
  type Meal,
  type MealCategory,
  type MenuItem,
  type MealType,
  type RUMenuDay,
  type RUMenuWeek,
} from '@/types/ru'

const BASE_URL = 'https://ufc2012.ufc.br/restaurante/cardapio'

function getCampusMenuUrl(campusId: CampusId, dateParam?: string): string {
  const campus = UFC_CAMPUSES.find((c) => c.id === campusId)
  if (!campus) {
    throw new Error(`Campus desconhecido: ${campusId}`)
  }
  const campusUrl = `${BASE_URL}/${campus.slug}`
  return dateParam ? `${campusUrl}/${dateParam}` : campusUrl
}

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
]

/**
 * Retorna a data atual no formato YYYY-MM-DD no fuso oficial de Fortaleza/UFC (America/Fortaleza, UTC-3)
 */
export function getFortalezaTodayDate(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}

export function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d, 12, 0, 0)
  const weekday = WEEKDAY_NAMES[dt.getDay()] || ''
  const dd = String(d).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  return `${weekday} (${dd}/${mm})`
}

export interface WeekDaysRange {
  monday: string
  friday: string
  allDays: string[]
  prevWeek: string
  nextWeek: string
  label: string
}

export function getMondayOfWeek(referenceDate?: string): string {
  return getWeekDaysRange(referenceDate).monday
}

/**
 * Calcula os dias úteis (Segunda a Sexta) de uma semana de referência.
 * Se nenhuma data for informada no final de semana (sábado/domingo),
 * avança inteligentemente para a semana seguinte (segunda-feira).
 */
export function getWeekDaysRange(referenceDate?: string): WeekDaysRange {
  let target: Date

  if (!referenceDate) {
    const todayStr = getFortalezaTodayDate()
    const [y, m, d] = todayStr.split('-').map(Number)
    target = new Date(y, m - 1, d, 12, 0, 0)
    const day = target.getDay()
    // No fim de semana (sábado ou domingo), direciona para a próxima segunda-feira útil
    if (day === 0) {
      target.setDate(target.getDate() + 1)
    } else if (day === 6) {
      target.setDate(target.getDate() + 2)
    }
  } else {
    const [y, m, d] = referenceDate.split('-').map(Number)
    target = new Date(y, m - 1, d, 12, 0, 0)
  }

  const dayOfWeek = target.getDay()
  // Calcula o offset para a segunda-feira correspondente (dia 1)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(target)
  monday.setDate(target.getDate() + diffToMonday)

  const allDays: string[] = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    allDays.push(`${yyyy}-${mm}-${dd}`)
  }

  const prevMonday = new Date(monday)
  prevMonday.setDate(monday.getDate() - 7)
  const prevY = prevMonday.getFullYear()
  const prevM = String(prevMonday.getMonth() + 1).padStart(2, '0')
  const prevD = String(prevMonday.getDate()).padStart(2, '0')

  const nextMonday = new Date(monday)
  nextMonday.setDate(monday.getDate() + 7)
  const nextY = nextMonday.getFullYear()
  const nextM = String(nextMonday.getMonth() + 1).padStart(2, '0')
  const nextD = String(nextMonday.getDate()).padStart(2, '0')

  const [, mMonth, mDay] = allDays[0].split('-')
  const [, fMonth, fDay] = allDays[4].split('-')
  const label = `Semana de ${mDay}/${mMonth} a ${fDay}/${fMonth}`

  return {
    monday: allDays[0],
    friday: allDays[4],
    allDays,
    prevWeek: `${prevY}-${prevM}-${prevD}`,
    nextWeek: `${nextY}-${nextM}-${nextD}`,
    label,
  }
}

/**
 * Raspa o cardápio de um dia específico para um determinado campus.
 */
export async function scrapeRUMenuDay(
  campusId: CampusId = DEFAULT_CAMPUS_ID,
  dateParam?: string,
): Promise<RUMenuDay> {
  const targetUrl = getCampusMenuUrl(campusId, dateParam)

  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    next: { revalidate: 1800 },
  })

  if (!response.ok) {
    throw new Error(
      `Falha ao acessar o portal da UFC (Status ${response.status})`,
    )
  }

  const html = await response.text()
  const $ = load(html)

  const container = $('.c-cardapios')
  if (!container.length) {
    throw new Error(
      'Não foi possível encontrar a área de cardápios no site da UFC.',
    )
  }

  const campusTitle =
    container.find('h2').text().trim() ||
    `Restaurante Universitário (${campusId})`

  // Navegação de datas no cabeçalho da tabela do portal
  const tableNav = container.find('table[summary*="Cardápio"], table').first()

  const prevA = tableNav.find(
    'thead th.prev-box a, thead th.prev a, thead a.prev',
  )
  const prevHref = prevA.attr('href') || ''
  const prevDateMatch = prevHref.match(/\d{4}-\d{2}-\d{2}/)
  const prevDate = prevDateMatch ? prevDateMatch[0] : null
  const prevLabel = prevA.text().trim() || null

  const currentTh = tableNav.find(
    'thead th.atual, thead th:not(.prev-box):not(.next-box):not(.prev):not(.next)',
  )
  const rawCurrentLabel = currentTh.first().text().replace(/\s+/g, ' ').trim()

  const nextA = tableNav.find(
    'thead th.next-box a, thead th.next a, thead a.next',
  )
  const nextHref = nextA.attr('href') || ''
  const nextDateMatch = nextHref.match(/\d{4}-\d{2}-\d{2}/)
  const nextDate = nextDateMatch ? nextDateMatch[0] : null
  const nextLabel = nextA.text().trim() || null

  // Mensagem de restaurante fechado ou sem cardápio
  const emptyCell = container.find(
    'tbody td[colspan="3"], tbody td[style*="padding"]',
  )
  const hasEmptyNotice =
    emptyCell.length > 0 &&
    emptyCell.text().includes('Não há cardápio cadastrado')
  const emptyNoticeMessage = hasEmptyNotice
    ? emptyCell.text().replace(/\s+/g, ' ').trim()
    : null

  // Refeições esperadas
  const mealDefinitions: {
    type: MealType
    title: string
    selector: string
  }[] = [
    {
      type: 'desjejum',
      title: 'Desjejum',
      selector: 'table.refeicao.desjejum',
    },
    { type: 'almoco', title: 'Almoço', selector: 'table.refeicao.almoco' },
    { type: 'jantar', title: 'Jantar', selector: 'table.refeicao.jantar' },
  ]

  const meals: Record<MealType, Meal | null> = {
    desjejum: null,
    almoco: null,
    jantar: null,
  }

  for (const def of mealDefinitions) {
    const table = container.find(def.selector)
    if (!table.length) {
      meals[def.type] = null
      continue
    }

    const categories: MealCategory[] = []
    let hasAnyItem = false

    table.find('tbody.listras tr.item').each((_, tr) => {
      const $tr = $(tr)
      const categoryName = $tr.find('td').first().text().trim()
      const contentTd = $tr.find('td').last()

      if (!contentTd.text().trim()) {
        return
      }

      const rawHtml = contentTd.html() || ''
      const lines = rawHtml.split(/<br\s*\/?>/i)
      const items: MenuItem[] = []

      for (const line of lines) {
        const $line = load(`<div>${line}</div>`)
        const fullText = $line.text().trim()
        if (!fullText) continue

        const hasGluten =
          !!$line('.gluten').length || /gl[úu]ten/i.test(fullText)
        const hasLactose =
          !!$line('.lactose').length || /lactose/i.test(fullText)

        $line('.gluten, .lactose, .opcao').remove()
        let itemName = $line.text().trim()
        itemName = itemName.replace(/\s*\(\s*Contém\s+[^)]+\)/gi, '').trim()

        if (itemName) {
          hasAnyItem = true
          items.push({
            id: randomUUID(),
            name: itemName,
            hasGluten,
            hasLactose,
          })
        }
      }

      if (items.length > 0) {
        categories.push({
          category: categoryName,
          items,
        })
      }
    })

    meals[def.type] = {
      type: def.type,
      title: def.title,
      isEmpty: !hasAnyItem,
      categories,
    }
  }

  const isClosedOrEmpty =
    hasEmptyNotice ||
    (!meals.desjejum?.categories.length &&
      !meals.almoco?.categories.length &&
      !meals.jantar?.categories.length)

  // Data efetiva:
  // Se dateParam foi passado, confia nele.
  // Senão, extrai a data real da tabela no HTML retornado pelo portal da UFC (ex: "Domingo (27/09)").
  let resolvedDate: string
  if (dateParam) {
    resolvedDate = dateParam
  } else {
    const match = rawCurrentLabel.match(/(\d{1,2})\/(\d{1,2})/)
    if (match) {
      const dd = match[1].padStart(2, '0')
      const mm = match[2].padStart(2, '0')
      const year =
        prevDate?.slice(0, 4) ||
        nextDate?.slice(0, 4) ||
        getFortalezaTodayDate().slice(0, 4)
      resolvedDate = `${year}-${mm}-${dd}`
    } else {
      resolvedDate = getFortalezaTodayDate()
    }
  }

  // Previne loop na navegação caso o portal retorne nextDate ou prevDate igual à data resolvida
  const safeNextDate = nextDate && nextDate !== resolvedDate ? nextDate : null
  const safePrevDate = prevDate && prevDate !== resolvedDate ? prevDate : null

  const currentLabel =
    rawCurrentLabel || formatDateLabel(resolvedDate) || 'Cardápio'

  return {
    id: `${campusId}-${resolvedDate}`,
    campusId,
    campusName: campusTitle,
    date: resolvedDate,
    currentLabel,
    prevDate: safePrevDate,
    prevLabel: safePrevDate ? prevLabel : null,
    nextDate: safeNextDate,
    nextLabel: safeNextDate ? nextLabel : null,
    isClosedOrEmpty,
    emptyMessage: emptyNoticeMessage,
    meals,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Raspa o cardápio da semana inteira (Segunda a Sexta) para o campus indicado.
 * Executa as 5 requisições em paralelo com tratamento resiliente por dia.
 */
export async function scrapeRUMenuWeek(
  campusId: CampusId = DEFAULT_CAMPUS_ID,
  referenceDate?: string,
): Promise<RUMenuWeek> {
  const range = getWeekDaysRange(referenceDate)

  const results = await Promise.allSettled(
    range.allDays.map((d) => scrapeRUMenuDay(campusId, d)),
  )

  let campusName = `Restaurante Universitário (${campusId})`

  const days: RUMenuDay[] = results.map((res, index) => {
    const dayDate = range.allDays[index]
    if (res.status === 'fulfilled') {
      if (res.value.campusName) {
        campusName = res.value.campusName
      }
      return res.value
    }

    // Fallback resiliente para o dia caso a consulta individual falhe
    return {
      id: `${campusId}-${dayDate}`,
      campusId,
      campusName,
      date: dayDate,
      currentLabel: formatDateLabel(dayDate),
      prevDate: null,
      prevLabel: null,
      nextDate: null,
      nextLabel: null,
      isClosedOrEmpty: true,
      emptyMessage: 'Não foi possível carregar o cardápio deste dia.',
      meals: {
        desjejum: null,
        almoco: null,
        jantar: null,
      },
      updatedAt: new Date().toISOString(),
    }
  })

  return {
    id: `${campusId}-week-${range.monday}`,
    campusId,
    campusName,
    weekStartDate: range.monday,
    weekEndDate: range.friday,
    label: range.label,
    prevWeekDate: range.prevWeek,
    nextWeekDate: range.nextWeek,
    days,
    updatedAt: new Date().toISOString(),
  }
}
