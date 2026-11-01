import { IdentityErrors } from './errors'

// Sem SMTP, um admin gera o link e entrega ao usuário por fora
export const RESET_TOKEN_TTL_HOURS = 24

export type PasswordResetToken = {
  id: string
  userId: string
  tokenHash: string
  createdBy: string | null
  createdAt: Date
  expiresAt: Date
  usedAt: Date | null
}

export function issuePasswordResetToken(input: {
  id: string
  userId: string
  tokenHash: string
  createdBy: string
  now: Date
}): PasswordResetToken {
  return {
    id: input.id,
    userId: input.userId,
    tokenHash: input.tokenHash,
    createdBy: input.createdBy,
    createdAt: input.now,
    expiresAt: new Date(
      input.now.getTime() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000,
    ),
    usedAt: null,
  }
}

export function consumePasswordResetToken(
  token: PasswordResetToken,
  now: Date,
): PasswordResetToken {
  if (token.usedAt !== null) throw IdentityErrors.resetTokenUsed()
  // Vence no instante exato da expiração (é assim que um link novo
  // invalida os anteriores)
  if (token.expiresAt.getTime() <= now.getTime()) {
    throw IdentityErrors.resetTokenExpired()
  }
  return { ...token, usedAt: now }
}
