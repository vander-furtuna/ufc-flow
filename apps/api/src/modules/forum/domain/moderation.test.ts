import { describe, expect, it } from 'vitest'

import type { DomainError } from '../../../shared/domain/domain-error'
import type { Message } from './message'
import {
  assertCanReport,
  assertCanRestrict,
  blocks,
  isActive,
  moderate,
  newRestriction,
  shouldAutoHide,
  type Restriction,
} from './moderation'

const NOW = new Date('2026-11-03T12:00:00.000Z')
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60_000)

const message = (overrides: Partial<Message> = {}): Message => ({
  id: 'm1',
  courseId: 'c1',
  authorId: 'ana',
  parentId: null,
  rootId: null,
  content: 'O número da monitora é…',
  replyCount: 0,
  likeCount: 0,
  status: 'VISIBLE',
  createdAt: NOW,
  editedAt: null,
  removedAt: null,
  removedBy: null,
  removalReason: null,
  ...overrides,
})

const code = (work: () => unknown) => {
  try {
    work()
  } catch (error) {
    return (error as DomainError).code
  }
  return null
}

describe('denúncias', () => {
  it('não se denuncia a própria mensagem nem a já removida', () => {
    expect(code(() => assertCanReport(message(), 'bruno'))).toBeNull()
    expect(code(() => assertCanReport(message(), 'ana'))).toBe(
      'FORUM_CANNOT_REPORT_OWN',
    )
    expect(
      code(() => assertCanReport(message({ status: 'REMOVED' }), 'bruno')),
    ).toBe('FORUM_MESSAGE_UNAVAILABLE')
  })

  it.each([
    ['VISIBLE', 2, false],
    ['VISIBLE', 3, true],
    ['HIDDEN', 5, false],
  ] as const)(
    '%s com %i denúncias abertas oculta? %s',
    (status, open, hide) => {
      expect(shouldAutoHide(message({ status }), open)).toBe(hide)
    },
  )
})

describe('ações na mensagem', () => {
  it('ocultar só o que está visível', () => {
    expect(
      moderate(message(), { action: 'HIDE', reason: 'x' }, 'mod', NOW).status,
    ).toBe('HIDDEN')
    expect(
      code(() =>
        moderate(
          message({ status: 'HIDDEN' }),
          { action: 'HIDE', reason: 'x' },
          'mod',
          NOW,
        ),
      ),
    ).toBe('FORUM_INVALID_MODERATION')
  })

  it('remover guarda quem e a categoria pública', () => {
    expect(
      moderate(
        message({ status: 'HIDDEN' }),
        { action: 'REMOVE', reason: 'Telefone', category: 'PERSONAL_DATA' },
        'mod',
        NOW,
      ),
    ).toMatchObject({
      status: 'REMOVED',
      removedBy: 'mod',
      removedAt: NOW,
      removalReason: 'PERSONAL_DATA',
      // O texto fica guardado para poder restaurar
      content: 'O número da monitora é…',
    })
  })

  it('restaura oculta e removida pela moderação; a apagada pelo autor não', () => {
    const restored = moderate(
      message({
        status: 'REMOVED',
        removedBy: 'mod',
        removedAt: NOW,
        removalReason: 'SPAM',
      }),
      { action: 'RESTORE', reason: 'Engano' },
      'mod',
      NOW,
    )
    expect(restored).toMatchObject({
      status: 'VISIBLE',
      removedBy: null,
      removedAt: null,
      removalReason: null,
    })
    expect(
      moderate(
        message({ status: 'HIDDEN' }),
        { action: 'RESTORE', reason: 'ok!' },
        'mod',
        NOW,
      ).status,
    ).toBe('VISIBLE')
    expect(
      code(() =>
        moderate(
          message({ status: 'REMOVED', removedBy: 'ana', content: '' }),
          { action: 'RESTORE', reason: 'Engano' },
          'mod',
          NOW,
        ),
      ),
    ).toBe('FORUM_INVALID_MODERATION')
    expect(
      code(() =>
        moderate(message(), { action: 'RESTORE', reason: 'x' }, 'mod', NOW),
      ),
    ).toBe('FORUM_INVALID_MODERATION')
  })
})

describe('restrições', () => {
  const restriction = (overrides: Partial<Restriction> = {}): Restriction => ({
    id: 'r1',
    userId: 'ana',
    courseId: 'c1',
    type: 'MUTE',
    reason: 'Spam',
    createdBy: 'mod',
    createdAt: NOW,
    expiresAt: null,
    liftedAt: null,
    ...overrides,
  })

  it('prazo em dias ou sem prazo', () => {
    expect(
      newRestriction({
        id: 'r1',
        userId: 'ana',
        courseId: 'c1',
        type: 'BAN',
        reason: 'Assédio',
        createdBy: 'mod',
        days: 7,
        now: NOW,
      }).expiresAt,
    ).toEqual(days(7))
  })

  it.each([
    [{}, true],
    [{ expiresAt: days(1) }, true],
    [{ expiresAt: days(-1) }, false],
    [{ liftedAt: NOW }, false],
  ])('%o ativa? %s', (overrides, active) => {
    expect(isActive(restriction(overrides), NOW)).toBe(active)
  })

  it('MUTE lê mas não escreve; BAN nem lê', () => {
    expect(blocks(restriction(), 'READ')).toBe(false)
    expect(blocks(restriction(), 'WRITE')).toBe(true)
    expect(blocks(restriction({ type: 'BAN' }), 'READ')).toBe(true)
    expect(blocks(null, 'WRITE')).toBe(false)
  })

  it('não restringe a si, outro moderador do curso nem admin', () => {
    const target = { userId: 'ana', isAdmin: false, moderatesCourse: false }
    expect(code(() => assertCanRestrict('mod', target))).toBeNull()
    expect(code(() => assertCanRestrict('ana', target))).toBe(
      'FORUM_CANNOT_RESTRICT_SELF',
    )
    expect(
      code(() =>
        assertCanRestrict('mod', { ...target, moderatesCourse: true }),
      ),
    ).toBe('FORUM_CANNOT_RESTRICT_STAFF')
    expect(
      code(() => assertCanRestrict('mod', { ...target, isAdmin: true })),
    ).toBe('FORUM_CANNOT_RESTRICT_STAFF')
  })
})
