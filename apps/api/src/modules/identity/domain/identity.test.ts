import { describe, expect, it } from 'vitest'

import { DomainError } from '../../../shared/domain/domain-error'
import {
  approveModeratorRequest,
  cancelModeratorRequest,
  checkNewModeratorRequest,
  rejectModeratorRequest,
  type ModeratorRequest,
} from './moderator-request'
import { checkPassword, normalizeEmail } from './credentials'
import {
  consumePasswordResetToken,
  issuePasswordResetToken,
  RESET_TOKEN_TTL_HOURS,
} from './password-reset-token'
import { rotateSession, startSession, type Session } from './session'

const now = new Date('2026-11-01T12:00:00Z')
const later = (ms: number) => new Date(now.getTime() + ms)
const HOUR = 3_600_000
const DAY = 24 * HOUR

const codeOf = (fn: () => unknown) => {
  try {
    fn()
  } catch (error) {
    if (error instanceof DomainError) return `${error.kind}:${error.code}`
    throw error
  }
  return 'sem erro'
}

describe('credenciais', () => {
  it('e-mail sem espaços e em minúsculas', () => {
    expect(normalizeEmail('  Ana.Souza@ALU.UFC.br ')).toBe(
      'ana.souza@alu.ufc.br',
    )
  })

  it('senha de 8 a 128 caracteres', () => {
    expect(codeOf(() => checkPassword('12345678'))).toBe('sem erro')
    expect(codeOf(() => checkPassword('1234567'))).toBe(
      'INVALID:PASSWORD_TOO_SHORT',
    )
    expect(codeOf(() => checkPassword('x'.repeat(129)))).toBe(
      'INVALID:PASSWORD_TOO_LONG',
    )
  })
})

describe('sessão', () => {
  const first = startSession({
    id: 's1',
    userId: 'u1',
    familyId: 'f1',
    refreshTokenHash: 'h1',
    now,
    ttlDays: 30,
    userAgent: 'Chrome',
    ip: '10.0.0.1',
  })

  it('começa ativa e expira em ttlDays', () => {
    expect(first).toMatchObject({
      revokedAt: null,
      replacedById: null,
      expiresAt: later(30 * DAY),
    })
  })

  const rotate = (session: Session, at: Date) =>
    rotateSession(session, {
      nextId: 's2',
      refreshTokenHash: 'h2',
      now: at,
      ttlDays: 30,
      userAgent: 'Chrome',
      ip: '10.0.0.2',
    })

  it('girar revoga a sessão atual e cria a próxima na mesma família', () => {
    const result = rotate(first, later(HOUR))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.previous).toMatchObject({
      revokedAt: later(HOUR),
      replacedById: 's2',
    })
    expect(result.value.next).toMatchObject({
      id: 's2',
      familyId: 'f1',
      refreshTokenHash: 'h2',
      expiresAt: later(HOUR + 30 * DAY),
    })
  })

  it('reusar um token já girado é reuso: a família toda cai', () => {
    const rotated = rotate(first, later(HOUR))
    if (!rotated.ok) throw new Error()
    expect(rotate(rotated.value.previous, later(2 * HOUR))).toEqual({
      ok: false,
      error: 'REFRESH_TOKEN_REUSED',
    })
  })

  it('token expirado não gira', () => {
    expect(rotate(first, later(31 * DAY))).toEqual({
      ok: false,
      error: 'REFRESH_TOKEN_EXPIRED',
    })
  })
})

describe('link de redefinição de senha', () => {
  const token = issuePasswordResetToken({
    id: 't1',
    userId: 'u1',
    tokenHash: 'th',
    createdBy: 'admin',
    now,
  })

  it('vale por 24 horas', () => {
    expect(RESET_TOKEN_TTL_HOURS).toBe(24)
    expect(token.expiresAt).toEqual(later(24 * HOUR))
  })

  it('é de uso único', () => {
    const used = consumePasswordResetToken(token, later(HOUR))
    expect(used.usedAt).toEqual(later(HOUR))
    expect(codeOf(() => consumePasswordResetToken(used, later(2 * HOUR)))).toBe(
      'INVALID:PASSWORD_RESET_TOKEN_USED',
    )
  })

  it('expira', () => {
    expect(
      codeOf(() => consumePasswordResetToken(token, later(24 * HOUR + 1))),
    ).toBe('INVALID:PASSWORD_RESET_TOKEN_EXPIRED')
  })
})

describe('pedido de moderação', () => {
  const pending: ModeratorRequest = {
    id: 'r1',
    userId: 'u1',
    courseId: 'c1',
    justification: 'Mantenho a grade do curso atualizada',
    status: 'PENDING',
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    createdAt: now,
  }

  it('não abre um segundo pedido pendente nem pede o que já tem', () => {
    expect(
      codeOf(() =>
        checkNewModeratorRequest({ hasPending: true, isModerator: false }),
      ),
    ).toBe('CONFLICT:MODERATOR_REQUEST_PENDING_EXISTS')
    expect(
      codeOf(() =>
        checkNewModeratorRequest({ hasPending: false, isModerator: true }),
      ),
    ).toBe('CONFLICT:MODERATOR_ALREADY_ACTIVE')
    expect(
      codeOf(() =>
        checkNewModeratorRequest({ hasPending: false, isModerator: false }),
      ),
    ).toBe('sem erro')
  })

  it('aprovar e rejeitar registram quem, quando e a nota', () => {
    expect(
      approveModeratorRequest(pending, { reviewerId: 'a1', now, note: null }),
    ).toMatchObject({ status: 'APPROVED', reviewedBy: 'a1', reviewedAt: now })
    expect(
      rejectModeratorRequest(pending, { reviewerId: 'a1', now, note: 'Não' }),
    ).toMatchObject({ status: 'REJECTED', reviewNote: 'Não' })
  })

  it('só o dono cancela', () => {
    expect(cancelModeratorRequest(pending, 'u1').status).toBe('CANCELED')
    expect(codeOf(() => cancelModeratorRequest(pending, 'u2'))).toBe(
      'FORBIDDEN:ACCESS_DENIED',
    )
  })

  it.each(['APPROVED', 'REJECTED', 'CANCELED'] as const)(
    'pedido %s não muda mais',
    (status) => {
      const closed = { ...pending, status }
      const review = { reviewerId: 'a1', now, note: null }
      for (const action of [
        () => approveModeratorRequest(closed, review),
        () => rejectModeratorRequest(closed, review),
        () => cancelModeratorRequest(closed, 'u1'),
      ]) {
        expect(codeOf(action)).toBe('CONFLICT:MODERATOR_REQUEST_NOT_PENDING')
      }
    },
  )
})
