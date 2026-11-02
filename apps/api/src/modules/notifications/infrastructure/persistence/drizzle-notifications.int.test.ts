import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  startDatabase,
  type TestDatabase,
} from '../../../../../test/support/database'
import { RandomIdGenerator } from '../../../../shared/infrastructure/random-id-generator'
import { identityRepositories } from '../../../identity/infrastructure/persistence/drizzle-identity'
import { SteppingClock } from '../../../catalog/application/testing/in-memory-catalog'
import {
  ListNotificationsUseCase,
  MarkNotificationsReadUseCase,
  NotificationDispatcher,
  PurgeNotificationsUseCase,
} from '../../application/notifications.use-cases'
import type { NotificationDraft } from '../../domain/notification'
import { DrizzleNotificationsUnitOfWork } from './drizzle-notifications'

let database: TestDatabase
const userId = randomUUID()
const HOUR = 60 * 60 * 1000

const draft = (requestId: string, groupKey: string | null = null) =>
  ({
    userId,
    type: 'MODERATOR_REQUEST_CREATED',
    actorId: null,
    courseId: null,
    entityType: 'moderator_request',
    entityId: requestId,
    groupKey,
    data: { requestId, requesterName: 'Ana', courseName: 'Eng.' },
  }) as NotificationDraft

beforeAll(async () => {
  database = await startDatabase()
  const now = new Date()
  await identityRepositories(database.db).users.insert({
    id: userId,
    name: 'Bia',
    email: 'bia@ufc.br',
    passwordHash: 'x',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  })
})

afterAll(async () => {
  await database?.stop()
})

describe('notificações no PostgreSQL', () => {
  it('pagina pela última atualização, agrupa e apaga as lidas antigas', async () => {
    const uow = new DrizzleNotificationsUnitOfWork(database.db)
    const clock = new SteppingClock('2026-08-01T12:00:00.000Z')
    const ids = new RandomIdGenerator()
    const dispatcher = new NotificationDispatcher(uow, clock, ids)
    const list = new ListNotificationsUseCase(uow)
    const read = new MarkNotificationsReadUseCase(uow, clock)

    const requests = Array.from({ length: 5 }, () => randomUUID())
    for (const requestId of requests) {
      await dispatcher.deliver([draft(requestId)], null)
      clock.advance(HOUR)
    }
    // A primeira volta ao topo quando soma na mesma chave
    const grouped = randomUUID()
    await dispatcher.deliver([draft(grouped, 'grupo')], null)
    clock.advance(HOUR)
    await dispatcher.deliver([draft(grouped, 'grupo')], null)

    const first = await list.execute(userId, { limit: 4 })
    expect(first.items).toHaveLength(4)
    expect(first.items[0]!.data).toMatchObject({ requestId: grouped })
    const second = await list.execute(userId, {
      limit: 4,
      cursor: first.nextCursor!,
    })
    expect(second.nextCursor).toBeNull()
    expect(
      [...first.items, ...second.items].map((item) => item.id),
    ).toHaveLength(6)

    await read.execute(userId, { ids: [first.items[0]!.id] })
    clock.advance(100 * 24 * HOUR)
    await read.execute(userId, { ids: [first.items[1]!.id] })
    expect(await new PurgeNotificationsUseCase(uow, clock).execute()).toBe(1)
    expect((await list.execute(userId, { limit: 20 })).items).toHaveLength(5)
  })
})
