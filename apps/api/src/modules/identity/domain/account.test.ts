import { describe, expect, it } from 'vitest'

import { DomainError } from '../../../shared/domain/domain-error'
import {
  assertCanDeleteAccount,
  assertCanSuspend,
  assertCurrentVersions,
  pendingConsents,
} from './account'

const current = { terms: '1.0', privacy: '1.0' }

const codeOf = (fn: () => unknown) => {
  try {
    fn()
  } catch (error) {
    if (error instanceof DomainError) return `${error.kind}:${error.code}`
    throw error
  }
  return 'sem erro'
}

describe('pendingConsents', () => {
  it.each([
    ['nenhum aceite', [], ['TERMS', 'PRIVACY']],
    [
      'aceites da 0.1',
      [
        { document: 'TERMS', version: '0.1' },
        { document: 'PRIVACY', version: '0.1' },
      ],
      ['TERMS', 'PRIVACY'],
    ],
    [
      'só os termos atualizados',
      [
        { document: 'TERMS', version: '0.1' },
        { document: 'TERMS', version: '1.0' },
        { document: 'PRIVACY', version: '0.1' },
      ],
      ['PRIVACY'],
    ],
    [
      'tudo na versão vigente',
      [
        { document: 'TERMS', version: '1.0' },
        { document: 'PRIVACY', version: '1.0' },
      ],
      [],
    ],
    [
      'versão diferente, mesmo que "maior", pede novo aceite',
      [
        { document: 'TERMS', version: '2.0' },
        { document: 'PRIVACY', version: '1.0' },
      ],
      ['TERMS'],
    ],
  ] as const)('%s', (_, accepted, expected) => {
    expect(pendingConsents([...accepted], current)).toEqual(expected)
  })
})

describe('assertCurrentVersions', () => {
  it('aceita as versões vigentes', () => {
    expect(
      codeOf(() =>
        assertCurrentVersions(
          { termsVersion: '1.0', privacyVersion: '1.0' },
          current,
        ),
      ),
    ).toBe('sem erro')
  })

  it('recusa texto antigo', () => {
    expect(
      codeOf(() =>
        assertCurrentVersions(
          { termsVersion: '1.0', privacyVersion: '0.1' },
          current,
        ),
      ),
    ).toBe('CONFLICT:CONSENT_VERSION_OUTDATED')
  })
})

describe('assertCanDeleteAccount', () => {
  it.each([
    ['usuário comum', [], 1, 'sem erro'],
    ['admin com outro admin', ['ADMIN'], 2, 'sem erro'],
    ['último admin', ['ADMIN'], 1, 'CONFLICT:LAST_ADMIN'],
  ] as const)('%s', (_, roles, admins, expected) => {
    expect(codeOf(() => assertCanDeleteAccount([...roles], admins))).toBe(
      expected,
    )
  })
})

describe('assertCanSuspend', () => {
  it.each([
    ['outra conta comum', 'b', [], 'sem erro'],
    ['a própria conta', 'a', [], 'CONFLICT:CANNOT_SUSPEND_SELF'],
    ['outro admin', 'b', ['ADMIN'], 'CONFLICT:CANNOT_SUSPEND_ADMIN'],
  ] as const)('%s', (_, target, roles, expected) => {
    expect(codeOf(() => assertCanSuspend('a', target, [...roles]))).toBe(
      expected,
    )
  })
})
