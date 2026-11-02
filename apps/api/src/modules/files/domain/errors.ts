import { DomainError } from '../../../shared/domain/domain-error'

// Erros do módulo files, com códigos estáveis
export const FilesErrors = {
  fileNotFound: () =>
    new DomainError('FILE_NOT_FOUND', 'NOT_FOUND', 'Arquivo não encontrado'),
  typeNotAllowed: (accepted: string) =>
    new DomainError(
      'FILE_TYPE_NOT_ALLOWED',
      'INVALID',
      `Tipo de arquivo não aceito aqui (envie ${accepted})`,
    ),
  tooLarge: (maxMb: number) =>
    new DomainError(
      'FILE_TOO_LARGE',
      'TOO_LARGE',
      `Arquivo grande demais (até ${maxMb} MB)`,
    ),
  imageTooLarge: () =>
    new DomainError(
      'FILE_IMAGE_TOO_LARGE',
      'TOO_LARGE',
      'Imagem grande demais em pixels (até 40 megapixels)',
    ),
  unreadable: () =>
    new DomainError(
      'FILE_UNREADABLE',
      'INVALID',
      'Não foi possível ler o arquivo',
    ),
  courseRequired: () =>
    new DomainError(
      'FILE_COURSE_REQUIRED',
      'INVALID',
      'Informe o curso deste arquivo',
    ),
  courseNotAllowed: () =>
    new DomainError(
      'FILE_COURSE_NOT_ALLOWED',
      'INVALID',
      'Este tipo de arquivo não é de um curso',
    ),
  uploadLimit: () =>
    new DomainError(
      'FILE_UPLOAD_LIMIT',
      'RATE_LIMITED',
      'Muitos envios na última hora; tente mais tarde',
    ),
  wrongPurpose: () =>
    new DomainError(
      'FILE_WRONG_PURPOSE',
      'INVALID',
      'Este arquivo foi enviado para outra finalidade',
    ),
  alreadyAttached: () =>
    new DomainError(
      'FILE_ALREADY_ATTACHED',
      'CONFLICT',
      'Este arquivo já está em uso',
    ),
  accessDenied: () =>
    new DomainError(
      'ACCESS_DENIED',
      'FORBIDDEN',
      'Você não tem permissão para esta ação',
    ),
}
