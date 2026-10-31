import type { ScheduledClass } from './class'

export type Schedule = {
  id: string
  /**
   * Agendas antigas gravavam aqui o id da estrutura curricular (ex: "2006.2"),
   * que se repete entre cursos. Agendas novas gravam o id SIGAA do curso.
   * Para identificar o curso use `courseSlug` + `curriculumSlug`.
   */
  courseId: string
  courseSlug?: string
  curriculumSlug?: string
  year: number
  semester: number
  name: string
  createdAt: number
  updatedAt: number
  classes: ScheduledClass[]
}
