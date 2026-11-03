import { DomainError } from '../../../shared/domain/domain-error'

// Erros do módulo link-page, com códigos estáveis
export const LinkPageErrors = {
  courseNotFound: () =>
    new DomainError('COURSE_NOT_FOUND', 'NOT_FOUND', 'Curso não encontrado'),
  pageNotFound: () =>
    new DomainError(
      'LINK_PAGE_NOT_FOUND',
      'NOT_FOUND',
      'Página de links não encontrada',
    ),
  linkNotFound: () =>
    new DomainError('LINK_NOT_FOUND', 'NOT_FOUND', 'Link não encontrado'),
  sectionNotFound: () =>
    new DomainError(
      'LINK_SECTION_NOT_FOUND',
      'NOT_FOUND',
      'Seção não encontrada nesta página',
    ),
  socialLinkNotFound: () =>
    new DomainError(
      'SOCIAL_LINK_NOT_FOUND',
      'NOT_FOUND',
      'Rede social não encontrada',
    ),
  postNotFound: () =>
    new DomainError(
      'POST_NOT_FOUND',
      'NOT_FOUND',
      'Post não encontrado no hub do curso',
    ),
  slugTaken: () =>
    new DomainError(
      'LINK_PAGE_SLUG_TAKEN',
      'CONFLICT',
      'Este endereço já é usado por outra página',
    ),
  orderMismatch: () =>
    new DomainError(
      'LINK_ORDER_MISMATCH',
      'INVALID',
      'A ordem precisa trazer todas as seções e links da página, uma vez cada',
    ),
  accessDenied: () =>
    new DomainError(
      'ACCESS_DENIED',
      'FORBIDDEN',
      'Só moderadores do curso ou admins editam a página de links',
    ),
}
