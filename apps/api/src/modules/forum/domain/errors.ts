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
  moderationDenied: () =>
    new DomainError(
      'ACCESS_DENIED',
      'FORBIDDEN',
      'Só a moderação do curso e admins moderam o fórum',
    ),
  banned: () =>
    new DomainError(
      'FORUM_BANNED',
      'FORBIDDEN',
      'Você não tem acesso ao fórum deste curso por decisão da moderação',
    ),
  muted: () =>
    new DomainError(
      'FORUM_MUTED',
      'FORBIDDEN',
      'Você foi silenciado no fórum deste curso e não pode escrever nem curtir',
    ),
  cannotReportOwn: () =>
    new DomainError(
      'FORUM_CANNOT_REPORT_OWN',
      'FORBIDDEN',
      'Não dá para denunciar a própria mensagem',
    ),
  alreadyReported: () =>
    new DomainError(
      'FORUM_ALREADY_REPORTED',
      'CONFLICT',
      'Você já denunciou esta mensagem',
    ),
  invalidModeration: () =>
    new DomainError(
      'FORUM_INVALID_MODERATION',
      'CONFLICT',
      'Esta ação não vale para a situação atual da mensagem',
    ),
  noOpenReports: () =>
    new DomainError(
      'FORUM_NO_OPEN_REPORTS',
      'CONFLICT',
      'A mensagem não tem denúncias abertas',
    ),
  cannotRestrictSelf: () =>
    new DomainError(
      'FORUM_CANNOT_RESTRICT_SELF',
      'FORBIDDEN',
      'Não dá para restringir a si',
    ),
  cannotRestrictStaff: () =>
    new DomainError(
      'FORUM_CANNOT_RESTRICT_STAFF',
      'FORBIDDEN',
      'Moderadores do curso e admins não podem ser restringidos',
    ),
  userNotFound: () =>
    new DomainError('USER_NOT_FOUND', 'NOT_FOUND', 'Pessoa não encontrada'),
  restrictionNotFound: () =>
    new DomainError(
      'RESTRICTION_NOT_FOUND',
      'NOT_FOUND',
      'Restrição não encontrada ou já encerrada',
    ),
}
