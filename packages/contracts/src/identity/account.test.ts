import { describe, expect, it } from 'vitest'

import {
  CONSENT_VERSIONS,
  accountDeletionInputSchema,
  adminUserListQuerySchema,
  adminUserSchema,
  consentAcceptanceInputSchema,
  discardedEvaluationsSchema,
  personalDataExportSchema,
} from './account'

const id = '0b8f6a3e-2c1d-4f5e-9a7b-3c2d1e0f9a8b'

describe('CONSENT_VERSIONS', () => {
  it('termos e política estão na versão final (1.0)', () => {
    expect(CONSENT_VERSIONS).toEqual({ terms: '1.0', privacy: '1.0' })
  })
})

describe('consentAcceptanceInputSchema', () => {
  it('pede as duas versões', () => {
    expect(
      consentAcceptanceInputSchema.safeParse({
        termsVersion: '1.0',
        privacyVersion: '1.0',
      }).success,
    ).toBe(true)
    expect(
      consentAcceptanceInputSchema.safeParse({ termsVersion: '1.0' }).success,
    ).toBe(false)
  })
})

describe('accountDeletionInputSchema', () => {
  it('exige a senha', () => {
    expect(
      accountDeletionInputSchema.safeParse({ password: 'x' }).success,
    ).toBe(true)
    const empty = accountDeletionInputSchema.safeParse({ password: '' })
    expect(empty.error?.issues[0]?.message).toBe('Informe a senha')
  })
})

describe('personalDataExportSchema', () => {
  const empty = {
    consents: [],
    sessions: [],
    preferences: [],
    moderatorRequests: [],
    moderatedCourses: [],
    enrollments: [],
    subjectRecords: [],
    activityRecords: [],
    schedules: [],
    files: [],
    hubPosts: [],
    forumMessages: [],
    forumLikes: [],
    forumReports: [],
    evaluations: [],
    notifications: [],
  }

  it('aceita a exportação com a conta e as seções', () => {
    expect(
      personalDataExportSchema.safeParse({
        format: 'ufc-flow-export/v1',
        exportedAt: '2026-11-04T12:00:00Z',
        account: {
          id,
          name: 'Ana',
          email: 'ana@alu.ufc.br',
          status: 'ACTIVE',
          roles: [],
          avatarFileId: null,
          createdAt: '2026-11-01T12:00:00Z',
          updatedAt: '2026-11-01T12:00:00Z',
        },
        ...empty,
        schedules: [{ name: 'Minha agenda', items: [] }],
      }).success,
    ).toBe(true)
  })

  it('recusa outro formato', () => {
    expect(
      personalDataExportSchema.safeParse({ format: 'v2', ...empty }).success,
    ).toBe(false)
  })
})

describe('admin de usuários', () => {
  it('descreve o usuário com o número de avaliações', () => {
    expect(
      adminUserSchema.safeParse({
        id,
        name: 'Ana',
        email: 'ana@alu.ufc.br',
        status: 'SUSPENDED',
        roles: [],
        evaluationCount: 3,
        createdAt: '2026-11-01T12:00:00Z',
      }).success,
    ).toBe(true)
  })

  it('busca com termo e situação opcionais', () => {
    expect(adminUserListQuerySchema.parse({ q: '  ana ' })).toEqual({
      q: 'ana',
      limit: 20,
    })
    expect(
      adminUserListQuerySchema.safeParse({ status: 'BANNED' }).success,
    ).toBe(false)
  })

  it('conta as avaliações descartadas', () => {
    expect(discardedEvaluationsSchema.safeParse({ discarded: 0 }).success).toBe(
      true,
    )
    expect(
      discardedEvaluationsSchema.safeParse({ discarded: -1 }).success,
    ).toBe(false)
  })
})
