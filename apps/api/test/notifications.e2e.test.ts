import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

import type { INestApplication } from '@nestjs/common'
import type { NotificationView } from '@ufc-flow/contracts'
import { and, eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { parseEnv } from '../src/config/env'
import { createApp } from '../src/create-app'
import { classSections, curricula } from '../src/database/schema'
import {
  SIGAA_SECTION_SOURCE,
  type SigaaSectionSource,
} from '../src/modules/classes/domain/ports'
import { parseSigaaSections } from '../src/modules/classes/infrastructure/sigaa/sigaa-sections'
import { identityRepositories } from '../src/modules/identity/infrastructure/persistence/drizzle-identity'
import { Argon2PasswordHasher } from '../src/modules/identity/infrastructure/security/security-adapters'
import {
  insertCourse,
  startDatabase,
  type TestDatabase,
} from './support/database'

let database: TestDatabase
let app: INestApplication
let http: ReturnType<typeof request>
let admin: Record<string, string>
let ana: Record<string, string>
let fetchSections: ReturnType<typeof vi.fn<SigaaSectionSource['fetch']>>
let courseId: string

const ADMIN = { email: 'admin@ufc.br', password: 'senha do admin longa' }
const COURSE = 'engenharia-de-computacao'
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

const fixture = parseSigaaSections(
  readFileSync(
    new URL(
      '../src/modules/classes/infrastructure/sigaa/__fixtures__/turmas.html',
      import.meta.url,
    ),
    'utf8',
  ),
)

// Os handlers rodam depois da resposta: espera a notificação chegar
async function notificationsOf(
  who: Record<string, string>,
  count: number,
): Promise<NotificationView[]> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const response = await http.get('/v1/me/notifications').set(who).expect(200)
    if (response.body.items.length >= count) return response.body.items
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Esperava ${count} notificações`)
}

const unread = async (who: Record<string, string>) =>
  (await http.get('/v1/me/notifications/unread-count').set(who).expect(200))
    .body.count as number

beforeAll(async () => {
  database = await startDatabase()
  app = await createApp(
    parseEnv({
      NODE_ENV: 'test',
      DATABASE_URL: database.url,
      JWT_SECRET: 'segredo-dos-testes-e2e-com-32-caracteres',
      SIGAA_SYNC_ENABLED: 'false',
      CLASSES_SYNC_ENABLED: 'false',
    }),
    { logger: false },
  )
  await app.init()
  http = request(app.getHttpServer())
  const source = app.get<SigaaSectionSource>(SIGAA_SECTION_SOURCE)
  fetchSections = vi
    .fn<SigaaSectionSource['fetch']>()
    .mockResolvedValue(fixture)
  source.fetch = fetchSections

  const course = await insertCourse(database.db, {
    sigaaId: '657484',
    slug: COURSE,
    name: 'Engenharia de Computação',
  })
  courseId = course.id
  await database.db.insert(curricula).values({
    id: randomUUID(),
    courseId,
    code: '2006.2',
    effectiveTerm: '2006.2',
    slug: '2006-2',
    matrixName: 'Matriz',
    status: 'PUBLISHED',
    minTotalHours: 3600,
    mandatoryHours: 3000,
    optativeHours: 400,
    extensionHours: 360,
    specificActivityHours: 0,
    maxFreeOptativeHours: 0,
    minPeriods: 10,
    avgPeriods: 10,
    maxPeriods: 15,
    periodMinHours: 0,
    periodAvgHours: 0,
    periodMaxHours: 0,
  })

  const { users } = identityRepositories(database.db)
  const now = new Date()
  const adminId = randomUUID()
  await users.insert({
    id: adminId,
    name: 'Admin',
    email: ADMIN.email,
    passwordHash: await new Argon2PasswordHasher().hash(ADMIN.password),
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  })
  await users.addRole(adminId, 'ADMIN', null, now)
  admin = bearer(
    (await http.post('/v1/auth/sign-in').send(ADMIN).expect(200)).body.tokens
      .accessToken,
  )
  ana = bearer(
    (
      await http
        .post('/v1/auth/sign-up')
        .send({
          name: 'Ana Souza',
          email: 'ana@ufc.br',
          password: 'uma senha longa',
          acceptTerms: true,
          acceptPrivacy: true,
        })
        .expect(201)
    ).body.tokens.accessToken,
  )
  await http
    .post('/v1/admin/terms')
    .set(admin)
    .send({ code: '2026.2', startsAt: '2026-08-10', endsAt: '2026-12-11' })
    .expect(201)
})

afterAll(async () => {
  await app?.close()
  await database?.stop()
})

describe('notificações de ponta a ponta', () => {
  it('exige login', async () => {
    await http.get('/v1/me/notifications').expect(401)
    await http.get('/v1/me/notifications/unread-count').expect(401)
  })

  it('pedido de moderação avisa o admin; a aprovação, quem pediu', async () => {
    const requested = await http
      .post('/v1/moderator-requests')
      .set(ana)
      .send({
        courseId,
        justification: 'Sou do centro acadêmico e mantenho a grade atualizada.',
      })
      .expect(201)
    const [created] = await notificationsOf(admin, 1)
    expect(created).toMatchObject({
      type: 'MODERATOR_REQUEST_CREATED',
      readAt: null,
      data: {
        requestId: requested.body.id,
        requesterName: 'Ana Souza',
        courseName: 'Engenharia de Computação',
      },
    })
    expect(await unread(admin)).toBe(1)

    await http
      .post(`/v1/moderator-requests/${requested.body.id}/approve`)
      .set(admin)
      .send({})
      .expect(200)
    const [reviewed] = await notificationsOf(ana, 1)
    expect(reviewed).toMatchObject({
      type: 'MODERATOR_REQUEST_REVIEWED',
      data: { decision: 'APPROVED', courseSlug: COURSE },
    })
    // O admin não é avisado da própria aprovação
    expect(await unread(admin)).toBe(1)
  })

  it('turma da agenda com horário novo avisa a dona da agenda', async () => {
    const path = `/v1/terms/2026.2/courses/${COURSE}`
    await http.post(`${path}/collect`).set(admin).expect(200)
    const [algebra] = await database.db
      .select({ id: classSections.id })
      .from(classSections)
      .where(
        and(
          eq(classSections.subjectCode, 'SBL0056'),
          eq(classSections.sectionCode, '01'),
        ),
      )
    await http
      .put(`/v1/me/schedules/${randomUUID()}`)
      .set(ana)
      .send({
        courseSlug: COURSE,
        curriculumSlug: '2006-2',
        term: '2026.2',
        name: 'Meu cronograma',
        items: [{ sectionId: algebra!.id, color: 'blue' }],
      })
      .expect(200)

    fetchSections.mockResolvedValue(
      fixture.map((section) =>
        section.subjectCode === 'SBL0056' && section.sectionCode === '01'
          ? {
              ...section,
              slots: [{ weekday: 2, startTime: '10:00', endTime: '12:00' }],
            }
          : section,
      ),
    )
    await http.post(`${path}/collect`).set(admin).expect(200)
    const items = await notificationsOf(ana, 2)
    expect(items[0]).toMatchObject({
      type: 'SCHEDULE_SECTION_CHANGED',
      data: {
        sectionId: algebra!.id,
        subjectName: 'ÁLGEBRA LINEAR',
        sectionCode: '01',
        term: '2026.2',
        courseSlug: COURSE,
        curriculumSlug: '2006-2',
        scheduleNames: ['Meu cronograma'],
      },
    })
  })

  it('falha da coleta avisa a moderadora, não quem disparou; silenciar funciona', async () => {
    const path = `/v1/terms/2026.2/courses/${COURSE}`
    fetchSections.mockRejectedValue(new Error('SIGAA respondeu 503'))
    await http.post(`${path}/collect`).set(admin).expect(200)
    const items = await notificationsOf(ana, 3)
    expect(items[0]).toMatchObject({
      type: 'SCRAPE_FAILED',
      data: { failures: 1, error: 'SIGAA respondeu 503', term: '2026.2' },
    })
    expect(
      (await notificationsOf(admin, 1)).some(
        (item) => item.type === 'SCRAPE_FAILED',
      ),
    ).toBe(false)

    // Segunda falha soma na mesma notificação
    await http.post(`${path}/collect`).set(admin).expect(200)
    await expect
      .poll(async () => (await notificationsOf(ana, 3))[0]!.data)
      .toMatchObject({ failures: 2 })
    expect(await notificationsOf(ana, 3)).toHaveLength(3)

    await http
      .put('/v1/me/notification-preferences')
      .set(ana)
      .send({ muted: ['SCRAPE_FAILED'] })
      .expect(200)
    expect(
      (await http.get('/v1/me/notification-preferences').set(ana).expect(200))
        .body,
    ).toEqual({ muted: ['SCRAPE_FAILED'] })
    await http
      .post('/v1/me/notifications/read')
      .set(ana)
      .send({ all: true })
      .expect(204)
    await http.post(`${path}/collect`).set(admin).expect(200)
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(await unread(ana)).toBe(0)
    expect(
      (await http.get('/v1/me/notifications?unread=true').set(ana).expect(200))
        .body.items,
    ).toEqual([])
  })
})
