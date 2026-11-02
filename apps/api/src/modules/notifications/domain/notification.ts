import type { NotificationData, NotificationType } from '@ufc-flow/contracts'

type DraftOf<T extends NotificationType> = {
  userId: string
  type: T
  // Quem causou: nunca é notificado da própria ação
  actorId: string | null
  courseId: string | null
  entityType: string
  entityId: string
  data: NotificationData<T>
  // Notificações não lidas com a mesma chave viram uma só
  groupKey: string | null
}

export type NotificationDraft = {
  [T in NotificationType]: DraftOf<T>
}[NotificationType]

export type NotificationRecord = NotificationDraft & {
  id: string
  readAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// Junta uma notificação nova à não lida de mesma chave: somas e listas onde
// fazem sentido, e os dados mais novos no resto
export function mergeNotification(
  existing: NotificationRecord,
  draft: NotificationDraft,
  now: Date,
): NotificationRecord {
  let data = draft.data
  if (draft.type === 'SCRAPE_FAILED' && existing.type === 'SCRAPE_FAILED') {
    data = { ...draft.data, failures: existing.data.failures + 1 }
  } else if (
    draft.type === 'IMPORT_PENDING' &&
    existing.type === 'IMPORT_PENDING'
  ) {
    data = { ...draft.data, imports: existing.data.imports + 1 }
  } else if (
    (draft.type === 'SCHEDULE_SECTION_CHANGED' ||
      draft.type === 'SCHEDULE_SECTION_REMOVED') &&
    existing.type === draft.type
  ) {
    data = {
      ...draft.data,
      scheduleNames: [
        ...new Set([
          ...existing.data.scheduleNames,
          ...draft.data.scheduleNames,
        ]),
      ],
    }
  }
  return {
    ...existing,
    ...draft,
    data,
    createdAt: existing.createdAt,
    updatedAt: now,
  } as NotificationRecord
}

// Quem recebe de fato: sem o autor da ação, sem quem silenciou o tipo e sem
// repetir a mesma pessoa no mesmo tipo
export function selectRecipients(
  drafts: readonly NotificationDraft[],
  options: {
    actorId: string | null
    muted: ReadonlyMap<string, ReadonlySet<NotificationType>>
  },
): NotificationDraft[] {
  const seen = new Set<string>()
  return drafts.filter((draft) => {
    const key = `${draft.userId}|${draft.type}|${draft.groupKey ?? draft.entityId}`
    if (
      draft.userId === options.actorId ||
      options.muted.get(draft.userId)?.has(draft.type) ||
      seen.has(key)
    ) {
      return false
    }
    seen.add(key)
    return true
  })
}

// Item de agenda que tem uma turma alterada ou removida
export type ScheduleHolder = {
  userId: string
  sectionId: string
  subjectCode: string
  subjectName: string
  sectionCode: string
  term: string
  courseId: string
  courseSlug: string
  curriculumSlug: string
  scheduleName: string
}

// Uma notificação por pessoa e turma, citando as agendas onde ela está.
// Turma removida não precisa do aviso de horário.
export function sectionNotifications(
  holders: readonly ScheduleHolder[],
  sections: { changed: ReadonlySet<string>; removed: ReadonlySet<string> },
): NotificationDraft[] {
  const byPersonAndSection = new Map<string, ScheduleHolder[]>()
  for (const holder of holders) {
    const key = `${holder.userId}|${holder.sectionId}`
    byPersonAndSection.set(key, [
      ...(byPersonAndSection.get(key) ?? []),
      holder,
    ])
  }
  return [...byPersonAndSection.values()].flatMap(
    (group): NotificationDraft[] => {
      const first = group[0]!
      const removed = sections.removed.has(first.sectionId)
      if (!removed && !sections.changed.has(first.sectionId)) return []
      const type = removed
        ? ('SCHEDULE_SECTION_REMOVED' as const)
        : ('SCHEDULE_SECTION_CHANGED' as const)
      return [
        {
          userId: first.userId,
          type,
          actorId: null,
          courseId: first.courseId,
          entityType: 'class_section',
          entityId: first.sectionId,
          groupKey: `${removed ? 'section-removed' : 'section-changed'}:${first.sectionId}`,
          data: {
            sectionId: first.sectionId,
            subjectCode: first.subjectCode,
            subjectName: first.subjectName,
            sectionCode: first.sectionCode,
            term: first.term,
            courseSlug: first.courseSlug,
            curriculumSlug: first.curriculumSlug,
            scheduleNames: [...new Set(group.map((item) => item.scheduleName))],
          },
        },
      ]
    },
  )
}
