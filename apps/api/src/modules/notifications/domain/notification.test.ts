import { describe, expect, it } from 'vitest'

import {
  mergeNotification,
  sectionNotifications,
  selectRecipients,
  type NotificationDraft,
  type NotificationRecord,
} from './notification'

const NOW = new Date('2026-11-02T12:00:00.000Z')
const BEFORE = new Date('2026-11-02T06:00:00.000Z')

const draft = (overrides: Partial<NotificationDraft> = {}): NotificationDraft =>
  ({
    userId: 'u1',
    type: 'SCRAPE_FAILED',
    actorId: null,
    courseId: 'c1',
    entityType: 'scrape_run',
    entityId: 'r2',
    groupKey: 'scrape-failed:c1:t1',
    data: {
      courseName: 'Eng. Comp.',
      courseSlug: 'eng-comp',
      term: '2026.2',
      error: 'SIGAA respondeu 503',
      failures: 1,
    },
    ...overrides,
  }) as NotificationDraft

const stored = (
  overrides: Partial<NotificationRecord> = {},
): NotificationRecord =>
  ({
    ...draft(),
    id: 'n1',
    entityId: 'r1',
    readAt: null,
    createdAt: BEFORE,
    updatedAt: BEFORE,
    ...overrides,
  }) as NotificationRecord

describe('mergeNotification', () => {
  it('falhas seguidas somam na mesma notificação', () => {
    const merged = mergeNotification(stored(), draft(), NOW)
    expect(merged).toMatchObject({
      id: 'n1',
      entityId: 'r2',
      createdAt: BEFORE,
      updatedAt: NOW,
      data: { failures: 2, error: 'SIGAA respondeu 503' },
    })
  })

  it('importações pendentes do mesmo curso somam', () => {
    const pending = (importId: string, imports: number) =>
      ({
        type: 'IMPORT_PENDING',
        data: {
          importId,
          sigaaId: '657494',
          courseName: 'MEDICINA',
          imports,
        },
      }) as Partial<NotificationDraft>
    const merged = mergeNotification(
      stored(pending('i1', 1)),
      draft(pending('i2', 1)),
      NOW,
    )
    expect(merged.data).toEqual({
      importId: 'i2',
      sigaaId: '657494',
      courseName: 'MEDICINA',
      imports: 2,
    })
  })

  it('turma com horário alterado de novo junta as agendas', () => {
    const section = (scheduleNames: string[]) =>
      ({
        type: 'SCHEDULE_SECTION_CHANGED',
        data: {
          sectionId: 's1',
          subjectCode: 'SBL0082',
          subjectName: 'MICROPROCESSADORES',
          sectionCode: '01',
          term: '2026.2',
          courseSlug: 'eng-comp',
          curriculumSlug: '2006-2',
          scheduleNames,
        },
      }) as Partial<NotificationDraft>
    const merged = mergeNotification(
      stored(section(['Plano A'])),
      draft(section(['Plano A', 'Plano B'])),
      NOW,
    )
    expect((merged.data as { scheduleNames: string[] }).scheduleNames).toEqual([
      'Plano A',
      'Plano B',
    ])
  })

  it('outros tipos ficam com os dados mais novos', () => {
    const reviewed = (decision: 'APPROVED' | 'REJECTED') =>
      ({
        type: 'MODERATOR_REQUEST_REVIEWED',
        data: {
          requestId: 'q1',
          courseName: 'Eng. Comp.',
          courseSlug: 'eng-comp',
          decision,
          note: null,
        },
      }) as Partial<NotificationDraft>
    expect(
      mergeNotification(
        stored(reviewed('REJECTED')),
        draft(reviewed('APPROVED')),
        NOW,
      ).data,
    ).toMatchObject({ decision: 'APPROVED' })
  })
})

describe('selectRecipients', () => {
  it('tira quem fez a ação, quem silenciou o tipo e repetidos', () => {
    const drafts = [
      draft({ userId: 'u1' }),
      draft({ userId: 'actor' }),
      draft({ userId: 'muted' }),
      draft({ userId: 'u1' }),
      draft({ userId: 'u2', type: 'IMPORT_PENDING' }),
    ]
    const muted = new Map([
      ['muted', new Set(['SCRAPE_FAILED' as const])],
      ['u2', new Set(['SCRAPE_FAILED' as const])],
    ])
    expect(
      selectRecipients(drafts, { actorId: 'actor', muted }).map(
        (item) => `${item.userId}:${item.type}`,
      ),
    ).toEqual(['u1:SCRAPE_FAILED', 'u2:IMPORT_PENDING'])
  })
})

describe('sectionNotifications', () => {
  const holder = (userId: string, sectionId: string, scheduleName: string) => ({
    userId,
    sectionId,
    subjectCode: 'SBL0082',
    subjectName: 'MICROPROCESSADORES',
    sectionCode: '01',
    term: '2026.2',
    courseId: 'c1',
    courseSlug: 'eng-comp',
    curriculumSlug: '2006-2',
    scheduleName,
  })

  it('uma por pessoa e turma, com as agendas onde ela está', () => {
    const drafts = sectionNotifications(
      [
        holder('u1', 's1', 'Plano A'),
        holder('u1', 's1', 'Plano B'),
        holder('u2', 's1', 'Meu cronograma'),
        holder('u1', 's2', 'Plano A'),
      ],
      { changed: new Set(['s1']), removed: new Set(['s2']) },
    )
    expect(
      drafts.map((item) => [
        item.userId,
        item.type,
        item.groupKey,
        (item.data as { scheduleNames: string[] }).scheduleNames,
      ]),
    ).toEqual([
      [
        'u1',
        'SCHEDULE_SECTION_CHANGED',
        'section-changed:s1',
        ['Plano A', 'Plano B'],
      ],
      [
        'u2',
        'SCHEDULE_SECTION_CHANGED',
        'section-changed:s1',
        ['Meu cronograma'],
      ],
      ['u1', 'SCHEDULE_SECTION_REMOVED', 'section-removed:s2', ['Plano A']],
    ])
    expect(drafts[0]).toMatchObject({
      courseId: 'c1',
      entityType: 'class_section',
      entityId: 's1',
      actorId: null,
    })
  })

  it('removida vale mais que alterada na mesma coleta', () => {
    const [only] = sectionNotifications([holder('u1', 's1', 'Plano A')], {
      changed: new Set(['s1']),
      removed: new Set(['s1']),
    })
    expect(only!.type).toBe('SCHEDULE_SECTION_REMOVED')
  })
})
