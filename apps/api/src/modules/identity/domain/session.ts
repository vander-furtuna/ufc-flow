import { err, ok, type Result } from '../../../shared/domain/result'

// Uma sessão guarda só o hash do token de renovação. Cada renovação gira o
// token: a sessão atual é revogada e substituída por outra da mesma família.
export type Session = {
  id: string
  userId: string
  familyId: string
  refreshTokenHash: string
  userAgent: string | null
  ip: string | null
  createdAt: Date
  expiresAt: Date
  revokedAt: Date | null
  replacedById: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

type SessionStart = {
  id: string
  userId: string
  familyId: string
  refreshTokenHash: string
  now: Date
  ttlDays: number
  userAgent: string | null
  ip: string | null
}

export function startSession(start: SessionStart): Session {
  return {
    id: start.id,
    userId: start.userId,
    familyId: start.familyId,
    refreshTokenHash: start.refreshTokenHash,
    userAgent: start.userAgent,
    ip: start.ip,
    createdAt: start.now,
    expiresAt: new Date(start.now.getTime() + start.ttlDays * DAY_MS),
    revokedAt: null,
    replacedById: null,
  }
}

export type RotationError = 'REFRESH_TOKEN_REUSED' | 'REFRESH_TOKEN_EXPIRED'

// Um token revogado que volta a aparecer foi copiado: o chamador revoga a
// família inteira (modelagem, Autenticação)
export function rotateSession(
  session: Session,
  next: Omit<SessionStart, 'id' | 'userId' | 'familyId'> & { nextId: string },
): Result<{ previous: Session; next: Session }, RotationError> {
  if (session.revokedAt !== null) return err('REFRESH_TOKEN_REUSED')
  if (session.expiresAt.getTime() <= next.now.getTime()) {
    return err('REFRESH_TOKEN_EXPIRED')
  }
  return ok({
    previous: { ...session, revokedAt: next.now, replacedById: next.nextId },
    next: startSession({
      ...next,
      id: next.nextId,
      userId: session.userId,
      familyId: session.familyId,
    }),
  })
}
