import type { Course } from '@/types/course'
import type { Schedule } from '@/types/schedule'

export type ScheduleCourseKey = {
  courseSlug: string
  curriculumSlug: string
}

/**
 * Descobre a qual curso pertence uma agenda antiga, que só guardava o id da
 * estrutura curricular (ex: "2006.2") — id que se repete entre cursos.
 *
 * 1. Se apenas um curso possui uma estrutura com esse id, a agenda é dele.
 * 2. Senão, vence o curso cuja estrutura contém mais disciplinas da agenda.
 * 3. Em caso de empate (ou agenda vazia), a agenda fica com o curso aberto
 *    no momento, desde que ele esteja entre os empatados.
 *
 * Retorna `null` quando não dá para decidir; a agenda continua sem curso e
 * é reavaliada na próxima vez que outro curso for aberto.
 */
export function resolveLegacyScheduleCourse(
  schedule: Schedule,
  courses: Course[],
  currentCourseSlug?: string,
): ScheduleCourseKey | null {
  const candidates = courses.flatMap((course) =>
    course.curriculumStructures
      .filter((curriculum) => curriculum.id === schedule.courseId)
      .map((curriculum) => ({
        courseSlug: course.slug,
        curriculumSlug: curriculum.slug,
        codes: new Set(curriculum.subjects.map((subject) => subject.code)),
      })),
  )

  if (candidates.length === 0) return null

  const toKey = ({ courseSlug, curriculumSlug }: ScheduleCourseKey) => ({
    courseSlug,
    curriculumSlug,
  })

  if (candidates.length === 1) return toKey(candidates[0])

  const classCodes = new Set(schedule.classes.map((cls) => cls.code))
  const scored = candidates.map((candidate) => ({
    ...candidate,
    score: [...classCodes].filter((code) => candidate.codes.has(code)).length,
  }))

  const bestScore = Math.max(...scored.map((candidate) => candidate.score))
  const best = scored.filter((candidate) => candidate.score === bestScore)

  if (best.length === 1 && bestScore > 0) return toKey(best[0])

  const current = best.find(
    (candidate) => candidate.courseSlug === currentCourseSlug,
  )
  return current ? toKey(current) : null
}
