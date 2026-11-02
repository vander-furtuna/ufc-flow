import { DomainError } from '../../../shared/domain/domain-error'

// Erros do módulo planning, com códigos estáveis
export const PlanningErrors = {
  scheduleNotFound: () =>
    new DomainError('SCHEDULE_NOT_FOUND', 'NOT_FOUND', 'Agenda não encontrada'),
  courseNotFound: () =>
    new DomainError('COURSE_NOT_FOUND', 'NOT_FOUND', 'Curso não encontrado'),
  curriculumNotFound: () =>
    new DomainError(
      'CURRICULUM_NOT_FOUND',
      'NOT_FOUND',
      'Estrutura curricular não encontrada neste curso',
    ),
  termNotFound: () =>
    new DomainError(
      'TERM_NOT_FOUND',
      'NOT_FOUND',
      'Semestre letivo não encontrado',
    ),
  sectionNotFound: () =>
    new DomainError(
      'SCHEDULE_SECTION_NOT_FOUND',
      'INVALID',
      'Uma das turmas não existe neste semestre',
    ),
  sectionRemoved: () =>
    new DomainError(
      'SCHEDULE_SECTION_REMOVED',
      'CONFLICT',
      'Esta turma não é mais ofertada no SIGAA',
    ),
  duplicateSubject: () =>
    new DomainError(
      'SCHEDULE_DUPLICATE_SUBJECT',
      'CONFLICT',
      'A agenda já tem uma turma desta disciplina',
    ),
  timeConflict: () =>
    new DomainError(
      'SCHEDULE_TIME_CONFLICT',
      'CONFLICT',
      'Esta turma conflita com o horário de outra da agenda',
    ),
}
