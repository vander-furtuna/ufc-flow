import type { NotificationView } from '@ufc-flow/contracts'

import { titleCase } from '@/utils/title-case'

export type NotificationCategory =
  'Agenda' | 'Fórum' | 'Moderação' | 'Turmas' | 'Importações'

// Trechos do texto; os em negrito são nomes (pessoa, disciplina, curso)
export type TextPart = { text: string; bold?: boolean }

export type NotificationDescription = {
  category: NotificationCategory
  parts: TextPart[]
  // Para onde a notificação leva; null quando ainda não há tela
  href: string | null
}

const quoted = (names: readonly string[]) => {
  const items = names.map((name) => `“${name}”`)
  return items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`
}

const b = (text: string): TextPart => ({ text, bold: true })
const t = (text: string): TextPart => ({ text })

export function describeNotification(
  notification: NotificationView,
): NotificationDescription {
  switch (notification.type) {
    case 'SCHEDULE_SECTION_CHANGED':
    case 'SCHEDULE_SECTION_REMOVED': {
      const { data } = notification
      const changed = notification.type === 'SCHEDULE_SECTION_CHANGED'
      return {
        category: 'Agenda',
        parts: [
          b(`${titleCase(data.subjectName)} · turma ${data.sectionCode}`),
          t(
            `${changed ? ' mudou de horário' : ' saiu do SIGAA'} e está em ${quoted(data.scheduleNames)}`,
          ),
        ],
        href: `/${data.courseSlug}/${data.curriculumSlug}/agenda`,
      }
    }
    case 'MODERATOR_REQUEST_REVIEWED': {
      const { data } = notification
      const approved = data.decision === 'APPROVED'
      return {
        category: 'Moderação',
        parts: [
          t('Sua solicitação de moderação de '),
          b(data.courseName),
          t(approved ? ' foi aprovada' : ' não foi aprovada'),
        ],
        href: approved ? '/admin/estruturas' : null,
      }
    }
    case 'MODERATOR_REQUEST_CREATED': {
      const { data } = notification
      return {
        category: 'Moderação',
        parts: [
          b(data.requesterName),
          t(' pediu para moderar '),
          b(data.courseName),
        ],
        // A tela de moderação do admin chega na fase 11
        href: null,
      }
    }
    case 'SCRAPE_FAILED': {
      const { data } = notification
      return {
        category: 'Turmas',
        parts: [
          t('A coleta de turmas de '),
          b(data.courseName),
          t(
            ` (${data.term}) falhou${data.failures > 1 ? ` ${data.failures} vezes seguidas` : ''}`,
          ),
        ],
        href: '/admin/semestres',
      }
    }
    case 'FORUM_REPLY':
    case 'FORUM_THREAD_REPLY': {
      const { data } = notification
      return {
        category: 'Fórum',
        parts: [
          b(data.authorName),
          t(
            notification.type === 'FORUM_REPLY'
              ? ' respondeu sua mensagem: '
              : ' respondeu numa conversa em que você está: ',
          ),
          t(`“${data.excerpt}”`),
        ],
        href: `/${data.courseSlug}/forum/${data.messageId}`,
      }
    }
    case 'FORUM_LIKES': {
      const { data } = notification
      const [first] = data.likerNames
      const others = data.likes - 1
      return {
        category: 'Fórum',
        parts: [
          b(first ?? 'Alguém'),
          t(
            others > 0
              ? ` e mais ${others} curtiram sua mensagem: `
              : ' curtiu sua mensagem: ',
          ),
          t(`“${data.excerpt}”`),
        ],
        href: `/${data.courseSlug}/forum/${data.messageId}`,
      }
    }
    case 'IMPORT_PENDING': {
      const { data } = notification
      const course = titleCase(data.courseName)
      return {
        category: 'Importações',
        parts:
          data.imports === 1
            ? [
                t('Uma estrutura de '),
                b(course),
                t(' aguarda o curso ser criado'),
              ]
            : [
                t(`${data.imports} estruturas de `),
                b(course),
                t(' aguardam o curso ser criado'),
              ],
        href: `/admin/cursos?sigaa=${encodeURIComponent(data.sigaaId)}`,
      }
    }
  }
}

const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
const DAY = 24 * 60 * 60 * 1000

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

// "agora", "há 8 min", "há 1 h", "ontem", "há 3 dias" e, depois de uma
// semana, a data
export function timeAgo(iso: string, now: Date): string {
  const date = new Date(iso)
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY)
  if (days === 0) return `há ${Math.floor(minutes / 60)} h`
  if (days < 7) return relative.format(-days, 'day')
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// Grupos da página de notificações
export function dayGroup(iso: string, now: Date): 'Hoje' | 'Ontem' | 'Antes' {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / DAY)
  return days <= 0 ? 'Hoje' : days === 1 ? 'Ontem' : 'Antes'
}

export { titleCase }
