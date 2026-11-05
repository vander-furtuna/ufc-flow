import { DomainError } from '../../../shared/domain/domain-error'

// Erros do módulo identity, com códigos estáveis para o web e a extensão
export const IdentityErrors = {
  emailTaken: () =>
    new DomainError('USER_EMAIL_TAKEN', 'CONFLICT', 'Este e-mail já tem conta'),
  invalidCredentials: () =>
    new DomainError(
      'INVALID_CREDENTIALS',
      'UNAUTHORIZED',
      'E-mail ou senha incorretos',
    ),
  userSuspended: () =>
    new DomainError('USER_SUSPENDED', 'FORBIDDEN', 'Esta conta está suspensa'),
  userNotFound: () =>
    new DomainError('USER_NOT_FOUND', 'NOT_FOUND', 'Usuário não encontrado'),
  passwordTooShort: () =>
    new DomainError(
      'PASSWORD_TOO_SHORT',
      'INVALID',
      'A senha precisa de pelo menos 8 caracteres',
    ),
  passwordTooLong: () =>
    new DomainError(
      'PASSWORD_TOO_LONG',
      'INVALID',
      'A senha pode ter até 128 caracteres',
    ),
  refreshTokenInvalid: () =>
    new DomainError(
      'REFRESH_TOKEN_INVALID',
      'UNAUTHORIZED',
      'Sessão inválida; entre de novo',
    ),
  refreshTokenExpired: () =>
    new DomainError(
      'REFRESH_TOKEN_EXPIRED',
      'UNAUTHORIZED',
      'Sessão expirada; entre de novo',
    ),
  refreshTokenReused: () =>
    new DomainError(
      'REFRESH_TOKEN_REUSED',
      'UNAUTHORIZED',
      'Sessão encerrada por segurança; entre de novo',
    ),
  resetTokenInvalid: () =>
    new DomainError(
      'PASSWORD_RESET_TOKEN_INVALID',
      'INVALID',
      'Link de redefinição inválido',
    ),
  resetTokenUsed: () =>
    new DomainError(
      'PASSWORD_RESET_TOKEN_USED',
      'INVALID',
      'Este link já foi usado; peça outro a um administrador',
    ),
  resetTokenExpired: () =>
    new DomainError(
      'PASSWORD_RESET_TOKEN_EXPIRED',
      'INVALID',
      'Este link expirou; peça outro a um administrador',
    ),
  courseNotFound: () =>
    new DomainError('COURSE_NOT_FOUND', 'NOT_FOUND', 'Curso não encontrado'),
  moderatorRequestNotFound: () =>
    new DomainError(
      'MODERATOR_REQUEST_NOT_FOUND',
      'NOT_FOUND',
      'Pedido de moderação não encontrado',
    ),
  moderatorRequestPendingExists: () =>
    new DomainError(
      'MODERATOR_REQUEST_PENDING_EXISTS',
      'CONFLICT',
      'Já existe um pedido pendente para este curso',
    ),
  moderatorAlreadyActive: () =>
    new DomainError(
      'MODERATOR_ALREADY_ACTIVE',
      'CONFLICT',
      'Você já modera este curso',
    ),
  moderatorRequestNotPending: () =>
    new DomainError(
      'MODERATOR_REQUEST_NOT_PENDING',
      'CONFLICT',
      'Este pedido já foi respondido ou cancelado',
    ),
  accessDenied: () =>
    new DomainError(
      'ACCESS_DENIED',
      'FORBIDDEN',
      'Você não tem permissão para esta ação',
    ),
  consentOutdated: () =>
    new DomainError(
      'CONSENT_VERSION_OUTDATED',
      'CONFLICT',
      'Os documentos mudaram; recarregue a página e leia a versão atual',
    ),
  passwordMismatch: () =>
    new DomainError('PASSWORD_MISMATCH', 'INVALID', 'Senha incorreta'),
  lastAdmin: () =>
    new DomainError(
      'LAST_ADMIN',
      'CONFLICT',
      'Você é o único admin; nomeie outro admin antes de excluir a conta',
    ),
  cannotSuspendSelf: () =>
    new DomainError(
      'CANNOT_SUSPEND_SELF',
      'CONFLICT',
      'Você não pode suspender a própria conta',
    ),
  cannotSuspendAdmin: () =>
    new DomainError(
      'CANNOT_SUSPEND_ADMIN',
      'CONFLICT',
      'Contas de admin não podem ser suspensas',
    ),
}
