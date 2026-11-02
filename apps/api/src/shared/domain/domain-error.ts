// Categoria do erro, sem amarrar o domínio ao HTTP. O filtro de Problem
// Details traduz cada categoria para um status.
export type ErrorKind =
  | 'INVALID'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_LARGE'
  | 'RATE_LIMITED'

export class DomainError extends Error {
  constructor(
    // Código estável em SCREAMING_SNAKE_CASE, como USER_EMAIL_TAKEN
    readonly code: string,
    readonly kind: ErrorKind,
    message: string,
  ) {
    super(message)
    this.name = 'DomainError'
  }
}
