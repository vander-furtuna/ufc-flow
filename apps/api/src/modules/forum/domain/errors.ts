import { FORUM_LIMITS } from '@ufc-flow/contracts'

import { DomainError } from '../../../shared/domain/domain-error'

// Erros do módulo forum, com códigos estáveis
export const ForumErrors = {
  courseNotFound: () =>
    new DomainError('COURSE_NOT_FOUND', 'NOT_FOUND', 'Curso não encontrado'),
  messageNotFound: () =>
    new DomainError(
      'FORUM_MESSAGE_NOT_FOUND',
      'NOT_FOUND',
      'Mensagem não encontrada',
    ),
  subjectNotFound: () =>
    new DomainError(
      'SUBJECT_NOT_FOUND',
      'NOT_FOUND',
      'Disciplina não encontrada',
    ),
  loginRequired: () =>
    new DomainError(
      'FORUM_LOGIN_REQUIRED',
      'FORBIDDEN',
      'Entre na sua conta para ler o fórum',
    ),
  cannotPost: () =>
    new DomainError(
      'FORUM_POST_FORBIDDEN',
      'FORBIDDEN',
      'Só quem tem matrícula ativa no curso, a moderação e admins escrevem no fórum',
    ),
  notAuthor: () =>
    new DomainError(
      'FORUM_NOT_AUTHOR',
      'FORBIDDEN',
      'Só quem escreveu pode mudar a mensagem',
    ),
  unavailable: () =>
    new DomainError(
      'FORUM_MESSAGE_UNAVAILABLE',
      'CONFLICT',
      'Esta mensagem não está mais disponível',
    ),
  editClosed: () =>
    new DomainError(
      'FORUM_EDIT_WINDOW_CLOSED',
      'CONFLICT',
      `A mensagem só pode ser editada até ${FORUM_LIMITS.editMinutes} minutos depois do envio`,
    ),
  tooManyMentions: () =>
    new DomainError(
      'FORUM_TOO_MANY_MENTIONS',
      'INVALID',
      `Cite até ${FORUM_LIMITS.mentions} disciplinas por mensagem`,
    ),
  rateLimited: () =>
    new DomainError(
      'FORUM_RATE_LIMITED',
      'RATE_LIMITED',
      'Você está enviando rápido demais. Espere um pouco e tente de novo',
    ),
}
