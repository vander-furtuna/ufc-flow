import { DomainError } from '../../../shared/domain/domain-error'

// Erros do módulo hub, com códigos estáveis
export const HubErrors = {
  courseNotFound: () =>
    new DomainError('COURSE_NOT_FOUND', 'NOT_FOUND', 'Curso não encontrado'),
  postNotFound: () =>
    new DomainError('POST_NOT_FOUND', 'NOT_FOUND', 'Post não encontrado'),
  accessDenied: () =>
    new DomainError(
      'ACCESS_DENIED',
      'FORBIDDEN',
      'Só moderadores do curso ou admins gerenciam o hub',
    ),
  institutionalOnlyAdmin: () =>
    new DomainError(
      'POST_INSTITUTIONAL_ADMIN_ONLY',
      'FORBIDDEN',
      'Só admins publicam posts institucionais',
    ),
}
