import { DomainError } from '../../../shared/domain/domain-error'

// Nomes dos campos nas mensagens de bloqueio
const FIELD_LABELS: Record<string, string> = {
  code: 'o código da EC',
  effectiveTerm: 'o período de vigor',
  slug: 'o endereço (slug)',
  hours: 'as cargas horárias exigidas',
  nature: 'a natureza da disciplina',
  subject: 'a remoção da disciplina',
  branches: 'a remoção ou troca de natureza no vínculo com vertentes',
  branch: 'a remoção da vertente',
  branchRules: 'o tipo, a vertente-mãe ou os mínimos da vertente',
}

// Erros do módulo catalog, com códigos estáveis para o web e a extensão
export const CatalogErrors = {
  courseNotFound: () =>
    new DomainError('COURSE_NOT_FOUND', 'NOT_FOUND', 'Curso não encontrado'),
  courseExists: () =>
    new DomainError(
      'COURSE_ALREADY_EXISTS',
      'CONFLICT',
      'Este curso do SIGAA já existe no Flow',
    ),
  courseSlugTaken: () =>
    new DomainError(
      'COURSE_SLUG_TAKEN',
      'CONFLICT',
      'Já existe um curso com este endereço',
    ),
  courseHasPublishedCurricula: () =>
    new DomainError(
      'COURSE_HAS_PUBLISHED_CURRICULA',
      'CONFLICT',
      'Só dá para excluir um curso sem estruturas publicadas',
    ),
  sigaaCourseNotFound: () =>
    new DomainError(
      'SIGAA_COURSE_NOT_FOUND',
      'NOT_FOUND',
      'Curso não encontrado no catálogo do SIGAA',
    ),
  courseMismatch: () =>
    new DomainError(
      'CURRICULUM_IMPORT_COURSE_MISMATCH',
      'INVALID',
      'A matriz e a unidade do arquivo não batem com o curso do SIGAA informado',
    ),
  curriculumNotFound: () =>
    new DomainError(
      'CURRICULUM_NOT_FOUND',
      'NOT_FOUND',
      'Estrutura curricular não encontrada',
    ),
  curriculumSlugTaken: () =>
    new DomainError(
      'CURRICULUM_SLUG_TAKEN',
      'CONFLICT',
      'O curso já tem uma estrutura com este endereço',
    ),
  lockedField: (field: string) =>
    new DomainError(
      'CURRICULUM_LOCKED_FIELD',
      'CONFLICT',
      `Já há matrícula nesta estrutura: ${FIELD_LABELS[field] ?? field} não pode mudar. Crie uma estrutura nova.`,
    ),
  alreadyPublished: () =>
    new DomainError(
      'CURRICULUM_ALREADY_PUBLISHED',
      'CONFLICT',
      'Esta estrutura já está publicada',
    ),
  notPublished: () =>
    new DomainError(
      'CURRICULUM_NOT_PUBLISHED',
      'CONFLICT',
      'Só uma estrutura publicada pode ser a vigente',
    ),
  publicationBlocked: () =>
    new DomainError(
      'CURRICULUM_PUBLICATION_BLOCKED',
      'CONFLICT',
      'A checagem de publicação encontrou erros; resolva antes de publicar',
    ),
  subjectNotFound: (code: string) =>
    new DomainError(
      'SUBJECT_NOT_FOUND',
      'NOT_FOUND',
      `A disciplina ${code} não existe no catálogo`,
    ),
  subjectNotInCurriculum: (code: string) =>
    new DomainError(
      'CURRICULUM_SUBJECT_NOT_FOUND',
      'NOT_FOUND',
      `A disciplina ${code} não está nesta estrutura`,
    ),
  subjectAlreadyInCurriculum: (code: string) =>
    new DomainError(
      'CURRICULUM_SUBJECT_EXISTS',
      'CONFLICT',
      `A disciplina ${code} já está nesta estrutura`,
    ),
  newSubjectRequired: (code: string) =>
    new DomainError(
      'SUBJECT_DATA_REQUIRED',
      'INVALID',
      `A disciplina ${code} não existe no catálogo: informe nome, tipo e cargas`,
    ),
  subjectCodeTaken: (code: string) =>
    new DomainError(
      'SUBJECT_CODE_TAKEN',
      'CONFLICT',
      `Já existe a disciplina ${code}`,
    ),
  subjectLockedField: () =>
    new DomainError(
      'SUBJECT_LOCKED_FIELD',
      'CONFLICT',
      'A disciplina está numa estrutura publicada: código, cargas e créditos não podem mudar',
    ),
  selfEquivalence: (code: string) =>
    new DomainError(
      'SUBJECT_SELF_EQUIVALENCE',
      'INVALID',
      `A disciplina ${code} não pode ser equivalente a si mesma`,
    ),
  branchNotFound: () =>
    new DomainError(
      'BRANCH_NOT_FOUND',
      'NOT_FOUND',
      'Vertente não encontrada nesta estrutura',
    ),
  branchHasChildren: () =>
    new DomainError(
      'BRANCH_HAS_CHILDREN',
      'CONFLICT',
      'Remova antes os grupos dentro desta vertente',
    ),
  branchCycle: () =>
    new DomainError(
      'BRANCH_CYCLE',
      'INVALID',
      'Uma vertente não pode ficar dentro de si mesma',
    ),
  invalidRange: (label: string) =>
    new DomainError(
      'INVALID_RANGE',
      'INVALID',
      `${label}: o mínimo é maior que o máximo`,
    ),
  duplicateBranchLink: () =>
    new DomainError(
      'DUPLICATE_BRANCH_LINK',
      'INVALID',
      'A disciplina aparece duas vezes na mesma vertente',
    ),
  importNotFound: () =>
    new DomainError(
      'CURRICULUM_IMPORT_NOT_FOUND',
      'NOT_FOUND',
      'Importação não encontrada',
    ),
  importNotPending: () =>
    new DomainError(
      'CURRICULUM_IMPORT_NOT_PENDING',
      'CONFLICT',
      'Esta importação já foi aplicada ou descartada',
    ),
  importCourseMissing: () =>
    new DomainError(
      'CURRICULUM_IMPORT_COURSE_MISSING',
      'CONFLICT',
      'O curso desta importação ainda não existe no Flow',
    ),
  reviewPointNotFound: () =>
    new DomainError(
      'REVIEW_POINT_NOT_FOUND',
      'NOT_FOUND',
      'Ponto para revisar não encontrado',
    ),
  reviewPointResolved: () =>
    new DomainError(
      'REVIEW_POINT_ALREADY_RESOLVED',
      'CONFLICT',
      'Este ponto já foi resolvido',
    ),
  invalidResolution: () =>
    new DomainError(
      'REVIEW_POINT_INVALID_RESOLUTION',
      'INVALID',
      'Esta resolução não serve para este ponto',
    ),
  accessDenied: () =>
    new DomainError(
      'ACCESS_DENIED',
      'FORBIDDEN',
      'Você não tem permissão para esta ação',
    ),
}
