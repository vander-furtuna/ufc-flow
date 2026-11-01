import { randomUUID } from 'node:crypto'

import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  insertCourse,
  startDatabase,
  type TestDatabase,
} from '../../../../../test/support/database'
import { DomainError } from '../../../../shared/domain/domain-error'
import type { User } from '../../domain/ports'
import { startSession } from '../../domain/session'
import {
  DrizzleIdentityUnitOfWork,
  identityRepositories,
} from './drizzle-identity'
import {
  auditLogs,
  moderatorRequests,
  sessions,
  users as usersTable,
} from './identity.schema'

let database: TestDatabase
const now = new Date('2026-11-01T12:00:00Z')

const newUser = (email: string): User => ({
  id: randomUUID(),
  name: 'Ana Souza',
  email,
  passwordHash: 'hash',
  status: 'ACTIVE',
  createdAt: now,
  updatedAt: now,
})

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    if (error instanceof DomainError) return error.code
    throw error
  }
  return 'sem erro'
}

beforeAll(async () => {
  database = await startDatabase()
})

afterAll(async () => {
  await database?.stop()
})

describe('repositórios Drizzle de identidade', () => {
  it('e-mail repetido vira USER_EMAIL_TAKEN', async () => {
    const { users } = identityRepositories(database.db)
    await users.insert(newUser('repetido@ufc.br'))
    expect(await codeOf(users.insert(newUser('repetido@ufc.br')))).toBe(
      'USER_EMAIL_TAKEN',
    )
  })

  it('o banco recusa e-mail com maiúsculas (CHECK)', async () => {
    const { users } = identityRepositories(database.db)
    await expect(users.insert(newUser('Maiuscula@ufc.br'))).rejects.toThrow()
  })

  it('um pedido pendente por usuário e curso, garantido pelo índice parcial', async () => {
    const { users, moderation } = identityRepositories(database.db)
    const user = newUser('pedido@ufc.br')
    await users.insert(user)
    const course = await insertCourse(database.db)
    const request = {
      userId: user.id,
      courseId: course.id,
      justification: 'Mantenho a grade atualizada',
      status: 'PENDING' as const,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: now,
    }
    await moderation.insertRequest({ id: randomUUID(), ...request })
    expect(
      await codeOf(moderation.insertRequest({ id: randomUUID(), ...request })),
    ).toBe('MODERATOR_REQUEST_PENDING_EXISTS')
    // Rejeitado não conta: pode pedir de novo
    await database.db
      .update(moderatorRequests)
      .set({ status: 'REJECTED' })
      .where(eq(moderatorRequests.userId, user.id))
    expect(
      await codeOf(moderation.insertRequest({ id: randomUUID(), ...request })),
    ).toBe('sem erro')
  })

  it('pagina a fila do mais novo ao mais antigo, desempatando pelo id', async () => {
    const { users, moderation } = identityRepositories(database.db)
    const course = await insertCourse(database.db)
    const ids: string[] = []
    for (let index = 0; index < 3; index++) {
      const user = newUser(`fila${index}@ufc.br`)
      await users.insert(user)
      const id = randomUUID()
      ids.push(id)
      await moderation.insertRequest({
        id,
        userId: user.id,
        courseId: course.id,
        justification: 'Mantenho a grade atualizada',
        status: 'PENDING',
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        createdAt: new Date(now.getTime() + index * 1000),
      })
    }
    const page = await moderation.listRequests({
      status: 'PENDING',
      before: null,
      limit: 2,
    })
    const ours = page.filter((row) => ids.includes(row.id))
    expect(ours.map((row) => row.id).slice(0, 2)).toEqual([ids[2], ids[1]])
    expect(ours[0]?.course).toEqual({
      id: course.id,
      slug: course.slug,
      name: course.name,
    })
    const next = await moderation.listRequests({
      status: 'PENDING',
      before: { createdAt: ours[1]!.createdAt, id: ours[1]!.id },
      limit: 10,
    })
    expect(next.map((row) => row.id)).toContain(ids[0])
    expect(next.map((row) => row.id)).not.toContain(ids[1])
  })

  it('revogar a família não toca em outras sessões', async () => {
    const { users, sessions: repo } = identityRepositories(database.db)
    const user = newUser('familia@ufc.br')
    await users.insert(user)
    const make = (familyId: string, hash: string) =>
      startSession({
        id: randomUUID(),
        userId: user.id,
        familyId,
        refreshTokenHash: hash,
        now,
        ttlDays: 30,
        userAgent: null,
        ip: null,
      })
    const familyA = randomUUID()
    await repo.insert(make(familyA, 'a1'))
    await repo.insert(make(familyA, 'a2'))
    await repo.insert(make(randomUUID(), 'b1'))
    await repo.revokeFamily(familyA, now)
    expect((await repo.findByTokenHash('a1'))?.revokedAt).toEqual(now)
    expect((await repo.findByTokenHash('a2'))?.revokedAt).toEqual(now)
    expect((await repo.findByTokenHash('b1'))?.revokedAt).toBeNull()
  })

  it('apagar o usuário apaga os dados pessoais e mantém a auditoria sem autor (LGPD)', async () => {
    const { users, sessions: repo, audit } = identityRepositories(database.db)
    const user = newUser('apagar@ufc.br')
    await users.insert(user)
    await repo.insert(
      startSession({
        id: randomUUID(),
        userId: user.id,
        familyId: randomUUID(),
        refreshTokenHash: 'apagar',
        now,
        ttlDays: 30,
        userAgent: null,
        ip: null,
      }),
    )
    const auditId = randomUUID()
    await audit.record({
      id: auditId,
      actorId: user.id,
      module: 'identity',
      entity: 'user',
      entityId: user.id,
      action: 'teste',
      changes: null,
      createdAt: now,
    })
    await database.db.delete(usersTable).where(eq(usersTable.id, user.id))
    expect(
      await database.db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, user.id)),
    ).toEqual([])
    const [entry] = await database.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.id, auditId))
    expect(entry?.actorId).toBeNull()
  })

  it('a unidade de trabalho desfaz tudo se o caso de uso falhar', async () => {
    const uow = new DrizzleIdentityUnitOfWork(database.db)
    const user = newUser('rollback@ufc.br')
    await expect(
      uow.run(async ({ users }) => {
        await users.insert(user)
        throw new Error('falha no meio')
      }),
    ).rejects.toThrow('falha no meio')
    expect(
      await identityRepositories(database.db).users.findById(user.id),
    ).toBeNull()
  })
})
