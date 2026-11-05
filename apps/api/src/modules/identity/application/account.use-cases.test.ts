import { describe, expect, it } from 'vitest'

import { ANONYMOUS, type Actor } from '../../../shared/domain/access-policy'
import { DomainError } from '../../../shared/domain/domain-error'
import { RecordingEventPublisher } from '../../../shared/domain/events'
import {
  AcceptConsentsUseCase,
  DeleteAccountUseCase,
  ExportPersonalDataUseCase,
} from './account.use-cases'
import { ListUsersUseCase, SetUserStatusUseCase } from './admin-users.use-cases'
import { GetMeUseCase } from './get-me.use-case'
import { identityTestbed } from './testing/in-memory-identity'

const MINUTE = 60_000

const actor = (userId: string, isAdmin = false): Actor => ({
  userId,
  isAdmin,
  moderatedCourseIds: new Set(),
  enrolledCourseIds: new Set(),
})

function setup() {
  const t = identityTestbed()
  const events = new RecordingEventPublisher()
  const people = [
    ['ana', 'Ana Souza'],
    ['bruno', 'Bruno Lima'],
    ['admin', 'Carla Admin'],
  ] as const
  people.forEach(([id, name], index) => {
    const at = new Date(t.clock.now().getTime() + index * MINUTE)
    t.store.users.set(id, {
      id,
      name,
      email: `${id}@alu.ufc.br`,
      passwordHash: 'hashed:senha certa',
      status: 'ACTIVE',
      createdAt: at,
      updatedAt: at,
    })
  })
  t.store.roles.set('admin', ['ADMIN'])
  t.store.consents.push(
    {
      id: 'c1',
      userId: 'ana',
      document: 'TERMS',
      version: '0.1',
      acceptedAt: t.clock.now(),
    },
    {
      id: 'c2',
      userId: 'ana',
      document: 'PRIVACY',
      version: '0.1',
      acceptedAt: t.clock.now(),
    },
  )
  return {
    ...t,
    events,
    admin: actor('admin', true),
    getMe: new GetMeUseCase(t.store, t.settings),
    accept: new AcceptConsentsUseCase(t.store, t.clock, t.ids, t.settings),
    exportData: new ExportPersonalDataUseCase(t.store, t.clock),
    deleteAccount: new DeleteAccountUseCase(
      t.store,
      t.hasher,
      t.clock,
      t.ids,
      events,
    ),
    list: new ListUsersUseCase(t.store),
    status: new SetUserStatusUseCase(t.store, t.clock, t.ids),
  }
}

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    if (error instanceof DomainError) return error.code
    throw error
  }
  return 'sem erro'
}

const current = { termsVersion: '1.0', privacyVersion: '1.0' }

describe('novo aceite', () => {
  it('o Me mostra os documentos aceitos numa versão antiga', async () => {
    const s = setup()
    expect((await s.getMe.execute('ana')).pendingConsents).toEqual([
      'TERMS',
      'PRIVACY',
    ])
  })

  it('aceitar as versões vigentes grava os aceites e limpa a pendência', async () => {
    const s = setup()
    const me = await s.accept.execute('ana', current)
    expect(me.pendingConsents).toEqual([])
    expect(
      s.store.consents
        .filter((consent) => consent.userId === 'ana')
        .map(({ document, version }) => `${document}@${version}`),
    ).toEqual(['TERMS@0.1', 'PRIVACY@0.1', 'TERMS@1.0', 'PRIVACY@1.0'])
  })

  it('aceitar de novo não duplica', async () => {
    const s = setup()
    await s.accept.execute('ana', current)
    await s.accept.execute('ana', current)
    expect(s.store.consents.filter((c) => c.userId === 'ana')).toHaveLength(4)
  })

  it('recusa versão que não é a vigente', async () => {
    const s = setup()
    expect(
      await codeOf(
        s.accept.execute('ana', { termsVersion: '0.1', privacyVersion: '1.0' }),
      ),
    ).toBe('CONSENT_VERSION_OUTDATED')
  })

  it('usuário inexistente', async () => {
    const s = setup()
    expect(await codeOf(s.accept.execute('ninguem', current))).toBe(
      'USER_NOT_FOUND',
    )
  })
})

describe('exportação', () => {
  it('traz a conta, os papéis e as seções, sem o hash da senha', async () => {
    const s = setup()
    const data = await s.exportData.execute('admin')
    expect(data).toMatchObject({
      format: 'ufc-flow-export/v1',
      exportedAt: '2026-11-01T12:00:00.000Z',
      account: {
        id: 'admin',
        name: 'Carla Admin',
        email: 'admin@alu.ufc.br',
        roles: ['ADMIN'],
        avatarFileId: null,
      },
    })
    expect(JSON.stringify(data)).not.toContain('hashed:')
  })

  it('inclui os consentimentos da pessoa', async () => {
    const s = setup()
    const data = await s.exportData.execute('ana')
    expect(data.consents).toHaveLength(2)
  })

  it('usuário inexistente', async () => {
    const s = setup()
    expect(await codeOf(s.exportData.execute('ninguem'))).toBe('USER_NOT_FOUND')
  })
})

describe('exclusão de conta', () => {
  it('confere a senha, apaga, audita sem dados pessoais e publica o evento', async () => {
    const s = setup()
    await s.deleteAccount.execute('ana', { password: 'senha certa' })
    expect(s.store.erased).toEqual(['ana'])
    expect(s.store.users.has('ana')).toBe(false)
    expect(s.store.auditEntries).toEqual([
      expect.objectContaining({
        actorId: null,
        entity: 'user',
        entityId: 'ana',
        action: 'account.deleted',
        changes: null,
      }),
    ])
    expect(s.events.events).toEqual([
      { type: 'AccountDeleted', userId: 'ana', occurredAt: s.clock.now() },
    ])
  })

  it('senha errada não apaga nada', async () => {
    const s = setup()
    expect(
      await codeOf(s.deleteAccount.execute('ana', { password: 'outra' })),
    ).toBe('PASSWORD_MISMATCH')
    expect(s.store.erased).toEqual([])
    expect(s.events.events).toEqual([])
  })

  it('o último admin não pode sair', async () => {
    const s = setup()
    expect(
      await codeOf(
        s.deleteAccount.execute('admin', { password: 'senha certa' }),
      ),
    ).toBe('LAST_ADMIN')
  })

  it('admin com outro admin pode sair', async () => {
    const s = setup()
    s.store.roles.set('bruno', ['ADMIN'])
    await s.deleteAccount.execute('admin', { password: 'senha certa' })
    expect(s.store.erased).toEqual(['admin'])
  })

  it('conta suspensa também pode ser excluída', async () => {
    const s = setup()
    s.store.users.set('ana', {
      ...s.store.users.get('ana')!,
      status: 'SUSPENDED',
    })
    await s.deleteAccount.execute('ana', { password: 'senha certa' })
    expect(s.store.erased).toEqual(['ana'])
  })

  it('usuário inexistente', async () => {
    const s = setup()
    expect(
      await codeOf(
        s.deleteAccount.execute('ninguem', { password: 'senha certa' }),
      ),
    ).toBe('USER_NOT_FOUND')
  })
})

describe('admin › usuários', () => {
  it('lista das contas mais novas, com papéis e avaliações', async () => {
    const s = setup()
    s.store.evaluationCounts.set('bruno', 3)
    const page = await s.list.execute(s.admin, { limit: 20 })
    expect(page.items.map((user) => user.id)).toEqual(['admin', 'bruno', 'ana'])
    expect(page.items[0]).toMatchObject({ roles: ['ADMIN'] })
    expect(page.items[1]).toMatchObject({ evaluationCount: 3 })
    expect(page.nextCursor).toBeNull()
  })

  it('busca por nome ou e-mail e pagina', async () => {
    const s = setup()
    expect(
      (await s.list.execute(s.admin, { q: 'BRUNO', limit: 20 })).items,
    ).toHaveLength(1)
    const first = await s.list.execute(s.admin, { limit: 2 })
    expect(first.nextCursor).not.toBeNull()
    const second = await s.list.execute(s.admin, {
      limit: 2,
      cursor: first.nextCursor!,
    })
    expect(second.items.map((user) => user.id)).toEqual(['ana'])
  })

  it('filtra por situação', async () => {
    const s = setup()
    await s.status.suspend(s.admin, 'bruno')
    const page = await s.list.execute(s.admin, {
      status: 'SUSPENDED',
      limit: 20,
    })
    expect(page.items.map((user) => user.id)).toEqual(['bruno'])
  })

  it('só admin', async () => {
    const s = setup()
    expect(await codeOf(s.list.execute(actor('ana'), { limit: 20 }))).toBe(
      'ACCESS_DENIED',
    )
    expect(await codeOf(s.status.suspend(ANONYMOUS, 'bruno'))).toBe(
      'ACCESS_DENIED',
    )
  })

  it('suspender encerra as sessões e audita; reativar devolve o acesso', async () => {
    const s = setup()
    s.store.sessions.set('s1', {
      id: 's1',
      userId: 'bruno',
      familyId: 'f1',
      refreshTokenHash: 'h',
      userAgent: null,
      ip: null,
      createdAt: s.clock.now(),
      expiresAt: new Date(s.clock.now().getTime() + 60 * MINUTE),
      revokedAt: null,
      replacedById: null,
    })
    await s.status.suspend(s.admin, 'bruno')
    expect(s.store.users.get('bruno')?.status).toBe('SUSPENDED')
    expect(s.store.sessions.get('s1')?.revokedAt).toEqual(s.clock.now())
    await s.status.reactivate(s.admin, 'bruno')
    expect(s.store.users.get('bruno')?.status).toBe('ACTIVE')
    expect(s.store.auditEntries.map((entry) => entry.action)).toEqual([
      'user.suspended',
      'user.reactivated',
    ])
  })

  it('repetir a situação atual não audita de novo', async () => {
    const s = setup()
    await s.status.reactivate(s.admin, 'bruno')
    expect(s.store.auditEntries).toEqual([])
  })

  it('não suspende a si mesmo, outro admin nem quem não existe', async () => {
    const s = setup()
    expect(await codeOf(s.status.suspend(s.admin, 'admin'))).toBe(
      'CANNOT_SUSPEND_SELF',
    )
    s.store.roles.set('bruno', ['ADMIN'])
    expect(await codeOf(s.status.suspend(s.admin, 'bruno'))).toBe(
      'CANNOT_SUSPEND_ADMIN',
    )
    expect(await codeOf(s.status.suspend(s.admin, 'ninguem'))).toBe(
      'USER_NOT_FOUND',
    )
  })
})
