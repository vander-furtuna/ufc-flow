import type { NotificationView } from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'

import { dayGroup, describeNotification, timeAgo, titleCase } from './describe'

const ID = '0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10'
const AT = '2026-11-02T12:00:00.000Z'

const notification = (
  type: NotificationView['type'],
  data: Record<string, unknown>,
) =>
  ({
    id: ID,
    type,
    data,
    readAt: null,
    createdAt: AT,
    updatedAt: AT,
  }) as NotificationView

const text = (view: NotificationView) =>
  describeNotification(view)
    .parts.map((part) => (part.bold ? `**${part.text}**` : part.text))
    .join('')

const section = {
  sectionId: ID,
  subjectCode: 'SBL0082',
  subjectName: 'MICROPROCESSADORES',
  sectionCode: '01',
  term: '2026.2',
  courseSlug: 'eng-comp',
  curriculumSlug: '2006-2',
  scheduleNames: ['Meu cronograma'],
}

describe('describeNotification', () => {
  it('turma da agenda: texto do mockup e link para a agenda', () => {
    const view = notification('SCHEDULE_SECTION_CHANGED', section)
    expect(text(view)).toBe(
      '**Microprocessadores · turma 01** mudou de horário e está em “Meu cronograma”',
    )
    expect(describeNotification(view)).toMatchObject({
      category: 'Agenda',
      href: '/eng-comp/2006-2/agenda',
    })
    expect(
      text(
        notification('SCHEDULE_SECTION_REMOVED', {
          ...section,
          scheduleNames: ['A', 'B', 'C'],
        }),
      ),
    ).toBe(
      '**Microprocessadores · turma 01** saiu do SIGAA e está em “A”, “B” e “C”',
    )
  })

  it('moderação: pedido e resposta', () => {
    const approved = notification('MODERATOR_REQUEST_REVIEWED', {
      requestId: ID,
      courseName: 'Eng. de Computação',
      courseSlug: 'eng-comp',
      decision: 'APPROVED',
      note: null,
    })
    expect(text(approved)).toBe(
      'Sua solicitação de moderação de **Eng. de Computação** foi aprovada',
    )
    expect(describeNotification(approved).href).toBe('/admin/estruturas')
    const rejected = notification('MODERATOR_REQUEST_REVIEWED', {
      requestId: ID,
      courseName: 'Música',
      courseSlug: 'musica',
      decision: 'REJECTED',
      note: 'Falta vínculo',
    })
    expect(text(rejected)).toContain('não foi aprovada')
    expect(describeNotification(rejected).href).toBeNull()
    expect(
      text(
        notification('MODERATOR_REQUEST_CREATED', {
          requestId: ID,
          requesterName: 'Ana Souza',
          courseName: 'Música',
        }),
      ),
    ).toBe('**Ana Souza** pediu para moderar **Música**')
  })

  it('coleta e importação, com a contagem agrupada', () => {
    const failed = (failures: number) =>
      notification('SCRAPE_FAILED', {
        courseName: 'Agronomia',
        courseSlug: 'agronomia',
        term: '2026.2',
        error: 'x',
        failures,
      })
    expect(text(failed(1))).toBe(
      'A coleta de turmas de **Agronomia** (2026.2) falhou',
    )
    expect(text(failed(3))).toBe(
      'A coleta de turmas de **Agronomia** (2026.2) falhou 3 vezes seguidas',
    )
    const pending = (imports: number) =>
      notification('IMPORT_PENDING', {
        importId: ID,
        sigaaId: '657494',
        courseName: 'MEDICINA - SOBRAL',
        imports,
      })
    expect(text(pending(1))).toBe(
      'Uma estrutura de **Medicina - Sobral** aguarda o curso ser criado',
    )
    expect(text(pending(2))).toBe(
      '2 estruturas de **Medicina - Sobral** aguardam o curso ser criado',
    )
    expect(describeNotification(pending(1)).href).toBe(
      '/admin/cursos?sigaa=657494',
    )
  })

  it('fórum: respostas e curtidas levam à conversa', () => {
    const reply = {
      messageId: ID,
      rootId: ID,
      courseSlug: 'eng-comp',
      courseName: 'Engenharia de Computação',
      authorName: 'Carla Mendes',
      excerpt: 'Cobrou Round Robin',
    }
    expect(text(notification('FORUM_REPLY', reply))).toBe(
      '**Carla Mendes** respondeu sua mensagem: “Cobrou Round Robin”',
    )
    expect(text(notification('FORUM_THREAD_REPLY', reply))).toBe(
      '**Carla Mendes** respondeu numa conversa em que você está: “Cobrou Round Robin”',
    )
    const likes = (count: number) =>
      notification('FORUM_LIKES', {
        messageId: ID,
        courseSlug: 'eng-comp',
        excerpt: 'Prova de SO?',
        likerNames: ['Ana'],
        likes: count,
      })
    expect(text(likes(1))).toBe('**Ana** curtiu sua mensagem: “Prova de SO?”')
    expect(text(likes(5))).toBe(
      '**Ana** e mais 4 curtiram sua mensagem: “Prova de SO?”',
    )
    expect(
      text(
        notification('MESSAGE_MODERATED', {
          messageId: ID,
          courseSlug: 'eng-comp',
          courseName: 'Engenharia de Computação',
          action: 'REMOVE',
          category: 'PERSONAL_DATA',
          excerpt: 'O número dela é',
        }),
      ),
    ).toBe(
      'Sua mensagem “O número dela é” foi removida pela moderação de **Engenharia de Computação** · dados pessoais',
    )
    const restricted = (lifted: boolean) =>
      notification('USER_RESTRICTED', {
        courseSlug: 'eng-comp',
        courseName: 'Engenharia de Computação',
        restriction: 'MUTE',
        lifted,
        expiresAt: lifted ? null : '2026-11-09T15:00:00.000Z',
      })
    expect(text(restricted(false))).toBe(
      'Você foi silenciado no fórum de **Engenharia de Computação** até 09/11',
    )
    expect(text(restricted(true))).toBe(
      'Sua restrição no fórum de **Engenharia de Computação** acabou',
    )
    expect(describeNotification(likes(1))).toMatchObject({
      category: 'Fórum',
      href: `/eng-comp/forum/${ID}`,
    })
  })
})

describe('textos auxiliares', () => {
  it('título só para o que vem todo em maiúsculas', () => {
    expect(titleCase('ESTÁGIO SUPERVISIONADO DE ENGENHARIA')).toBe(
      'Estágio Supervisionado de Engenharia',
    )
    expect(titleCase('Eng. de Computação')).toBe('Eng. de Computação')
  })

  it('tempo relativo e grupos por dia', () => {
    const now = new Date('2026-11-02T15:00:00')
    const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()
    const MIN = 60_000
    expect(timeAgo(ago(10_000), now)).toBe('agora')
    expect(timeAgo(ago(8 * MIN), now)).toBe('há 8 min')
    expect(timeAgo(ago(2 * 60 * MIN), now)).toBe('há 2 h')
    expect(timeAgo(ago(20 * 60 * MIN), now)).toBe('ontem')
    expect(timeAgo(ago(3 * 24 * 60 * MIN), now)).toBe('há 3 dias')
    expect(timeAgo(ago(10 * 24 * 60 * MIN), now)).toMatch(/23 de out/)
    expect(dayGroup(ago(MIN), now)).toBe('Hoje')
    expect(dayGroup(ago(20 * 60 * MIN), now)).toBe('Ontem')
    expect(dayGroup(ago(3 * 24 * 60 * MIN), now)).toBe('Antes')
  })
})
