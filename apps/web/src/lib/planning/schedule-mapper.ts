import type {
  ScheduleColor,
  ScheduleImportEntry,
  ScheduleInput,
  ScheduleView,
} from '@ufc-flow/contracts'

import { WEEKDAYS } from '@/lib/classes/legacy-sections'
import type { ScheduledClass, ScheduledClassColor } from '@/types/class'
import type { Schedule } from '@/types/schedule'

const COLORS: readonly ScheduledClassColor[] = [
  'red',
  'orange',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'blue',
  'violet',
  'fuchsia',
  'pink',
  'rose',
]

// Agendas locais antigas gravaram "fuschia" (D72)
export function normalizeColor(color: string | undefined): ScheduleColor {
  if (color === 'fuschia') return 'fuchsia'
  return COLORS.includes(color as ScheduledClassColor)
    ? (color as ScheduleColor)
    : 'blue'
}

export function normalizeLocalSchedule(schedule: Schedule): Schedule {
  return {
    ...schedule,
    classes: schedule.classes.map((cls) => ({
      ...cls,
      color: normalizeColor(cls.color),
    })),
  }
}

export const termOf = (schedule: Pick<Schedule, 'year' | 'semester'>) =>
  `${schedule.year}.${schedule.semester}`

// Agenda da conta no formato que a tela da agenda já usa. As vagas
// reservadas vêm das turmas carregadas do curso, quando estão lá.
export function fromScheduleView(
  view: ScheduleView,
  options: { courseId: string; reservedSeats?: (sectionId: string) => number },
): Schedule {
  const [year, semester] = view.term.split('.').map(Number)
  return {
    id: view.id,
    courseId: options.courseId,
    courseSlug: view.courseSlug,
    curriculumSlug: view.curriculumSlug,
    year: year!,
    semester: semester!,
    name: view.name,
    createdAt: Date.parse(view.createdAt),
    updatedAt: Date.parse(view.updatedAt),
    classes: view.items.map((item): ScheduledClass => ({
      id: item.sectionId,
      term: view.term,
      sectionId: item.sectionCode,
      instructors: item.instructors,
      reservedSeats: options.reservedSeats?.(item.sectionId) ?? 0,
      schedule: item.slots.map((slot) => ({
        id: `${item.sectionId}-${slot.weekday}-${slot.startTime}`,
        day: WEEKDAYS[slot.weekday - 1] ?? 'SEG',
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
      validity: {
        startDate: item.validFrom ?? '',
        endDate: item.validTo ?? '',
      },
      code: item.subjectCode,
      name: item.subjectName,
      color: item.color,
      changed: item.changed,
      removed: item.removed,
    })),
  }
}

// Agenda inteira para o PUT; acknowledged dispensa o aviso dessas turmas
export function toScheduleInput(
  schedule: Schedule,
  position: number,
  acknowledged: ReadonlySet<string> = new Set(),
): ScheduleInput {
  return {
    courseSlug: schedule.courseSlug!,
    curriculumSlug: schedule.curriculumSlug!,
    term: termOf(schedule),
    name: schedule.name,
    position,
    items: schedule.classes.map((cls) => ({
      sectionId: cls.id,
      color: normalizeColor(cls.color),
      ...(acknowledged.has(cls.id) ? { acknowledgeChange: true } : {}),
    })),
  }
}

// Agenda local para a importação: as turmas vão pela chave natural, porque
// os ids locais vieram do scraping antigo
export function toImportEntry(
  schedule: Schedule,
  key: { courseSlug: string; curriculumSlug: string },
): ScheduleImportEntry {
  return {
    id: schedule.id,
    ...key,
    term: termOf(schedule),
    name: schedule.name.trim().slice(0, 60) || 'Agenda',
    items: schedule.classes.slice(0, 40).map((cls) => ({
      subjectCode: cls.code,
      sectionCode: cls.sectionId,
      color: normalizeColor(cls.color),
    })),
  }
}
