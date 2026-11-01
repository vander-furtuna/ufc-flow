import { IdentityErrors } from './errors'

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

// E-mails são guardados em minúsculas (users.email tem CHECK lower)
export const normalizeEmail = (email: string) => email.trim().toLowerCase()

// Só o tamanho, sem regra de composição (orientação do NIST)
export function checkPassword(password: string) {
  // Mesma contagem do schema do contracts (z.string().min/max)
  const length = password.length
  if (length < PASSWORD_MIN_LENGTH) throw IdentityErrors.passwordTooShort()
  if (length > PASSWORD_MAX_LENGTH) throw IdentityErrors.passwordTooLong()
}
