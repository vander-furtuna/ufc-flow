import { DomainError } from '../../../shared/domain/domain-error'

// Erros do módulo classes, com códigos estáveis
export const ClassesErrors = {
  termInvalid: () =>
    new DomainError(
      'TERM_INVALID',
      'INVALID',
      'Semestre letivo inválido (use 2026.1 ou 2026.2, com o fim depois do início)',
    ),
  termNotFound: () =>
    new DomainError(
      'TERM_NOT_FOUND',
      'NOT_FOUND',
      'Semestre letivo não encontrado',
    ),
  noCurrentTerm: () =>
    new DomainError(
      'TERM_CURRENT_NOT_SET',
      'NOT_FOUND',
      'Nenhum semestre letivo está marcado como vigente',
    ),
  termExists: () =>
    new DomainError(
      'TERM_ALREADY_EXISTS',
      'CONFLICT',
      'Este semestre letivo já está cadastrado',
    ),
  termHasSections: () =>
    new DomainError(
      'TERM_HAS_SECTIONS',
      'CONFLICT',
      'Só dá para excluir um semestre sem turmas coletadas',
    ),
  courseNotFound: () =>
    new DomainError('COURSE_NOT_FOUND', 'NOT_FOUND', 'Curso não encontrado'),
  accessDenied: () =>
    new DomainError(
      'ACCESS_DENIED',
      'FORBIDDEN',
      'Você não tem permissão para esta ação',
    ),
}
