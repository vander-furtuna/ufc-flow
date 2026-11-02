import type { RecordViolationCode } from '@ufc-flow/academic-core'

import { DomainError } from '../../../shared/domain/domain-error'

// Mensagens das regras do histórico (academic-core), com a categoria HTTP
const RECORD_VIOLATIONS: Record<
  RecordViolationCode,
  [DomainError['kind'], string]
> = {
  RECORD_OPEN_ATTEMPT_EXISTS: [
    'CONFLICT',
    'Esta disciplina já está em CURSANDO; feche a situação antes',
  ],
  RECORD_IN_PROGRESS_OUTSIDE_CURRENT_TERM: [
    'INVALID',
    'CURSANDO só no semestre vigente',
  ],
  RECORD_TERM_IN_FUTURE: [
    'INVALID',
    'O semestre não pode ser posterior ao vigente',
  ],
  RECORD_TERM_NOT_AFTER_LAST_ATTEMPT: [
    'CONFLICT',
    'A nova tentativa precisa ser num semestre posterior à última',
  ],
  RECORD_SUBJECT_CLOSED: [
    'CONFLICT',
    'Esta disciplina já foi aprovada ou aproveitada',
  ],
  RECORD_INVALID_TRANSITION: [
    'CONFLICT',
    'Só um registro CURSANDO pode ter a situação fechada',
  ],
  RECORD_GRADE_NOT_ALLOWED: [
    'INVALID',
    'Nota só em APROVADO, REPROVADO ou APROVEITADA',
  ],
  RECORD_GRADE_OUT_OF_RANGE: ['INVALID', 'A nota vai de 0 a 10'],
  RECORD_GRADE_INVALID_PRECISION: [
    'INVALID',
    'A nota tem no máximo duas casas decimais',
  ],
}

// Erros do módulo academic-record, com códigos estáveis
export const AcademicRecordErrors = {
  recordViolation: (code: RecordViolationCode) => {
    const [kind, message] = RECORD_VIOLATIONS[code]
    return new DomainError(code, kind, message)
  },
  enrollmentNotFound: () =>
    new DomainError(
      'ENROLLMENT_NOT_FOUND',
      'NOT_FOUND',
      'Matrícula não encontrada',
    ),
  enrollmentExists: () =>
    new DomainError(
      'ENROLLMENT_ALREADY_EXISTS',
      'CONFLICT',
      'Você já tem matrícula neste curso; para trocar de estrutura, migre a EC',
    ),
  enrollmentNotActive: () =>
    new DomainError(
      'ENROLLMENT_NOT_ACTIVE',
      'CONFLICT',
      'Só a matrícula atual, ativa, troca de estrutura curricular',
    ),
  entryTermInFuture: () =>
    new DomainError(
      'ENROLLMENT_ENTRY_TERM_IN_FUTURE',
      'INVALID',
      'O semestre de entrada não pode ser posterior ao vigente',
    ),
  courseNotFound: () =>
    new DomainError('COURSE_NOT_FOUND', 'NOT_FOUND', 'Curso não encontrado'),
  curriculumNotFound: () =>
    new DomainError(
      'CURRICULUM_NOT_FOUND',
      'NOT_FOUND',
      'Estrutura curricular não encontrada neste curso',
    ),
  currentTermNotSet: () =>
    new DomainError(
      'CURRENT_TERM_NOT_SET',
      'CONFLICT',
      'Nenhum semestre vigente marcado; tente mais tarde',
    ),
  subjectNotFound: () =>
    new DomainError(
      'SUBJECT_NOT_FOUND',
      'NOT_FOUND',
      'Disciplina não encontrada no catálogo',
    ),
  recordNotFound: () =>
    new DomainError(
      'RECORD_NOT_FOUND',
      'NOT_FOUND',
      'Registro do histórico não encontrado',
    ),
  originNotAllowed: () =>
    new DomainError(
      'RECORD_ORIGIN_NOT_ALLOWED',
      'INVALID',
      'Só APROVEITADA aponta a origem do aproveitamento',
    ),
  sourceNotFound: () =>
    new DomainError(
      'RECORD_SOURCE_NOT_FOUND',
      'NOT_FOUND',
      'O registro de origem não é seu ou não existe',
    ),
  activityNotFound: () =>
    new DomainError(
      'ACTIVITY_NOT_FOUND',
      'NOT_FOUND',
      'Atividade não encontrada',
    ),
  categoryNotFound: () =>
    new DomainError(
      'ACTIVITY_CATEGORY_NOT_FOUND',
      'NOT_FOUND',
      'Categoria não encontrada nesta estrutura curricular',
    ),
  categoryKindMismatch: () =>
    new DomainError(
      'ACTIVITY_CATEGORY_KIND_MISMATCH',
      'INVALID',
      'A categoria é de outro tipo de atividade',
    ),
  accessDenied: () =>
    new DomainError(
      'ACCESS_DENIED',
      'FORBIDDEN',
      'Só moderadores do curso ou admins gerenciam as categorias',
    ),
}
