import type { Course } from '@/types/course'
import type { Schedule } from '@/types/schedule'

import { termOf } from './schedule-mapper'

export type CourseOption = {
  courseSlug: string
  curriculumSlug: string
  courseName: string
  // Disciplinas da agenda que existem na EC desse curso
  matches: number
}

export type ImportCandidate = {
  schedule: Schedule
  term: string
  // A primeira é a sugerida
  options: CourseOption[]
  // Agenda antiga cuja EC existe em mais de um curso: o usuário confirma
  ambiguous: boolean
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Agendas locais que podem ir para a conta. Agendas antigas só sabiam o id da
// EC, que se repete entre cursos: aí as opções vêm ordenadas pelas turmas
// que batem, como no hotfix (resolve-schedule-course).
export function findImportCandidates(
  schedules: readonly Schedule[],
  courses: readonly Course[],
): ImportCandidate[] {
  return schedules.flatMap((schedule): ImportCandidate[] => {
    if (schedule.classes.length === 0 || !UUID.test(schedule.id)) return []
    const codes = new Set(schedule.classes.map((cls) => cls.code))
    const options = courses
      .flatMap((course) =>
        course.curriculumStructures
          .filter((curriculum) =>
            schedule.courseSlug && schedule.curriculumSlug
              ? course.slug === schedule.courseSlug &&
                curriculum.slug === schedule.curriculumSlug
              : curriculum.id === schedule.courseId,
          )
          .map((curriculum) => ({
            courseSlug: course.slug,
            curriculumSlug: curriculum.slug,
            courseName: course.name,
            matches: curriculum.subjects.filter((subject) =>
              codes.has(subject.code),
            ).length,
          })),
      )
      .sort(
        (a, b) =>
          b.matches - a.matches || a.courseName.localeCompare(b.courseName),
      )
    if (options.length === 0) return []
    return [
      {
        schedule,
        term: termOf(schedule),
        options,
        ambiguous: options.length > 1,
      },
    ]
  })
}

export const sectionKey = (code: string, sectionCode: string) =>
  `${code}|${sectionCode}`

// Disciplinas cujas turmas não existem no semestre coletado
export function missingClasses(
  schedule: Schedule,
  available: ReadonlySet<string>,
): string[] {
  return schedule.classes
    .filter((cls) => !available.has(sectionKey(cls.code, cls.sectionId)))
    .map((cls) => cls.code)
}
