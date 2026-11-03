import type {
  EventModality,
  HubDeadline,
  PostListItem,
} from '@ufc-flow/contracts'

import { POST_TYPES } from '@/data/post-types'

// Datas do hub no horário de Fortaleza (UTC-3, sem horário de verão desde
// 2019). Fixo, para o servidor e o navegador mostrarem o mesmo dia.
const OFFSET_MS = 3 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const MONTHS = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
]

const MODALITIES: Record<EventModality, string> = {
  IN_PERSON: 'Presencial',
  ONLINE: 'On-line',
  HYBRID: 'Híbrido',
}

const local = (instant: string | Date) =>
  new Date(new Date(instant).getTime() - OFFSET_MS)
const pad = (value: number) => String(value).padStart(2, '0')
// Dias de calendário entre duas datas, em Fortaleza
const localDay = (instant: string | Date) =>
  Math.floor(local(instant).getTime() / DAY_MS)
const daysBetween = (from: string | Date, to: string | Date) =>
  localDay(to) - localDay(from)

export function dayMonth(instant: string): string {
  const date = local(instant)
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}`
}

export function fullDate(instant: string): string {
  return `${dayMonth(instant)}/${local(instant).getUTCFullYear()}`
}

export function timeOf(instant: string): string {
  const date = local(instant)
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

// "18/11", "18 a 22/11" ou "30/11 a 02/12"
export function dateRange(startsAt: string, endsAt: string | null): string {
  if (!endsAt || daysBetween(startsAt, endsAt) === 0) return dayMonth(startsAt)
  const start = local(startsAt)
  const end = local(endsAt)
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${pad(start.getUTCDate())} a ${dayMonth(endsAt)}`
  }
  return `${dayMonth(startsAt)} a ${dayMonth(endsAt)}`
}

// Caixinha de data do evento no card
export function eventDay(
  post: Pick<PostListItem, 'type' | 'startsAt'>,
): { month: string; day: string } | null {
  if (post.type !== 'EVENT' || !post.startsAt) return null
  const date = local(post.startsAt)
  return { month: MONTHS[date.getUTCMonth()]!, day: String(date.getUTCDate()) }
}

export function publishedLabel(post: PostListItem, now: Date): string {
  if (post.closed && post.deadlineAt) {
    return `Encerrado em ${dayMonth(post.deadlineAt)}`
  }
  // A situação (rascunho, arquivado) já vai no selo ao lado
  if (post.status !== 'PUBLISHED' || !post.publishedAt) {
    return `Atualizado em ${dayMonth(post.updatedAt)}`
  }
  const days = daysBetween(post.publishedAt, now)
  if (days <= 0) return 'Publicado hoje'
  if (days < 7) return `Publicado há ${days} ${days === 1 ? 'dia' : 'dias'}`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return `Publicado há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
  }
  return `Publicado em ${fullDate(post.publishedAt)}`
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  })
    .format(value)
    .replace(/ /g, ' ')

const vacancies = (value: unknown) =>
  typeof value === 'number'
    ? `${value} ${value === 1 ? 'vaga' : 'vagas'}`
    : null

const text = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null

// Os chips de baixo do card, conforme o tipo (mockup Hub)
export function postChips(post: PostListItem): string[] {
  if (post.closed) return ['Encerrado']
  const attributes = post.attributes
  const deadline = post.deadlineAt ? `Prazo ${dayMonth(post.deadlineAt)}` : null
  let chips: (string | null)[] = []
  switch (post.type) {
    case 'EVENT':
      chips = [
        post.startsAt ? dateRange(post.startsAt, post.endsAt) : null,
        post.location,
        MODALITIES[attributes.modality as EventModality] ?? null,
      ]
      break
    case 'SCHOLARSHIP':
      chips = [
        typeof attributes.amountBrl === 'number'
          ? `${money(attributes.amountBrl)}/mês`
          : null,
        vacancies(attributes.vacancies),
        typeof attributes.weeklyHours === 'number'
          ? `${attributes.weeklyHours} h/semana`
          : null,
        deadline,
      ]
      break
    case 'EXTENSION_PROJECT':
      chips = [vacancies(attributes.vacancies), text(attributes.contact)]
      break
    case 'CALL': {
      const number = text(attributes.number)
      const issuer = text(attributes.issuer)
      chips = [
        deadline,
        number
          ? [`Edital nº ${number}`, issuer].filter(Boolean).join(' · ')
          : issuer,
      ]
      break
    }
    case 'NEWS':
      chips = [post.location]
      break
  }
  return chips.filter((chip): chip is string => Boolean(chip))
}

// Prazos a até 14 dias aparecem em destaque ("Encerra em 8 dias")
const URGENT_DAYS = 14

export function deadlineHint(
  deadline: HubDeadline,
  now: Date,
): { text: string; urgent: boolean } {
  if (deadline.type === 'EVENT') {
    return {
      text: `Evento · ${dateRange(deadline.at, deadline.endsAt)}`,
      urgent: false,
    }
  }
  const days = daysBetween(now, deadline.at)
  if (days > URGENT_DAYS) {
    return { text: POST_TYPES[deadline.type].label, urgent: false }
  }
  const text =
    days <= 0
      ? 'Encerra hoje'
      : days === 1
        ? 'Encerra amanhã'
        : `Encerra em ${days} dias`
  return { text, urgent: true }
}

export type PostDetail = { label: string; value: string; href?: string }

const when = (startsAt: string, endsAt: string | null) => {
  const range = dateRange(startsAt, endsAt)
  const sameDay = !endsAt || daysBetween(startsAt, endsAt) === 0
  if (!sameDay) return range
  const end = endsAt && endsAt !== startsAt ? ` às ${timeOf(endsAt)}` : ''
  return `${range}, ${timeOf(startsAt)}${end}`
}

// Ficha da página do post, conforme o tipo (modelagem, Hub do curso)
export function postDetails(
  post: Pick<
    PostListItem,
    'type' | 'startsAt' | 'endsAt' | 'deadlineAt' | 'location' | 'attributes'
  >,
): PostDetail[] {
  const a = post.attributes
  const deadline = post.deadlineAt
    ? `${fullDate(post.deadlineAt)}, ${timeOf(post.deadlineAt)}`
    : null
  const rows: (PostDetail | null)[] = []
  const add = (label: string, value: string | null, href?: string) =>
    rows.push(value ? { label, value, ...(href ? { href } : {}) } : null)
  switch (post.type) {
    case 'EVENT':
      add('Quando', post.startsAt ? when(post.startsAt, post.endsAt) : null)
      add('Local', post.location)
      add('Modalidade', MODALITIES[a.modality as EventModality] ?? null)
      add(
        'Inscrição',
        text(a.registrationUrl) && 'Fazer inscrição',
        text(a.registrationUrl) ?? undefined,
      )
      break
    case 'SCHOLARSHIP':
      add('Prazo', deadline)
      add(
        'Valor',
        typeof a.amountBrl === 'number'
          ? `${money(a.amountBrl)} por mês`
          : null,
      )
      add('Vagas', typeof a.vacancies === 'number' ? String(a.vacancies) : null)
      add(
        'Carga',
        typeof a.weeklyHours === 'number'
          ? `${a.weeklyHours} h por semana`
          : null,
      )
      add('Financiador', text(a.sponsor))
      add('Requisitos', text(a.requirements))
      break
    case 'EXTENSION_PROJECT':
      add('Coordenação', text(a.coordinator))
      add('Vagas', typeof a.vacancies === 'number' ? String(a.vacancies) : null)
      add('Contato', text(a.contact))
      add('Local', post.location)
      break
    case 'CALL':
      add('Prazo', deadline)
      add('Número', text(a.number))
      add('Órgão', text(a.issuer))
      add(
        'Documento',
        text(a.documentUrl) && 'Abrir o edital',
        text(a.documentUrl) ?? undefined,
      )
      break
    case 'NEWS':
      add('Local', post.location)
      break
  }
  return rows.filter((row): row is PostDetail => row !== null)
}
