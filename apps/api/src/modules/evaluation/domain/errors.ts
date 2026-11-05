import { DomainError } from '../../../shared/domain/domain-error'

// Erros do módulo evaluation, com códigos estáveis
export const EvaluationErrors = {
  userNotFound: () =>
    new DomainError('USER_NOT_FOUND', 'NOT_FOUND', 'Usuário não encontrado'),
  subjectNotFound: () =>
    new DomainError(
      'SUBJECT_NOT_FOUND',
      'NOT_FOUND',
      'Disciplina não encontrada',
    ),
  criterionNotFound: () =>
    new DomainError(
      'EVALUATION_CRITERION_NOT_FOUND',
      'NOT_FOUND',
      'Critério não encontrado',
    ),
  keyTaken: () =>
    new DomainError(
      'EVALUATION_CRITERION_KEY_TAKEN',
      'CONFLICT',
      'Já existe um critério com essa chave',
    ),
  orderMismatch: () =>
    new DomainError(
      'EVALUATION_ORDER_MISMATCH',
      'INVALID',
      'A ordem precisa ter todos os critérios, uma vez cada',
    ),
  notEligible: () =>
    new DomainError(
      'EVALUATION_NOT_ELIGIBLE',
      'FORBIDDEN',
      'Só avalia quem foi aprovado ou reprovado na disciplina, segundo o histórico',
    ),
  institutionalEmailRequired: () =>
    new DomainError(
      'EVALUATION_INSTITUTIONAL_EMAIL_REQUIRED',
      'FORBIDDEN',
      'Avaliar exige uma conta com e-mail @alu.ufc.br',
    ),
  incomplete: () =>
    new DomainError(
      'EVALUATION_INCOMPLETE',
      'INVALID',
      'Dê uma nota para cada critério',
    ),
  unknownCriterion: () =>
    new DomainError(
      'EVALUATION_UNKNOWN_CRITERION',
      'INVALID',
      'Um dos critérios não existe ou está desativado',
    ),
  accessDenied: () =>
    new DomainError(
      'ACCESS_DENIED',
      'FORBIDDEN',
      'Só admins gerenciam os critérios de avaliação',
    ),
}
