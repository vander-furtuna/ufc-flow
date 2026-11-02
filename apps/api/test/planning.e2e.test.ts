import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

import type { INestApplication } from '@nestjs/common'
import type { ScheduleView } from '@ufc-flow/contracts'
import { and, eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { parseEnv } from '../src/config/env'
import { createApp } from '../src/create-app'
import {
  classSections,
  curricula,
  schedules,
  users,
} from '../src/database/schema'
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
let anaToken: string
let biaToken: string

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

async function signUp(email: string) {
  const response = await http
    .post('/v1/auth/sign-up')
    .send({
      name: 'Ana Souza',
      email,
      password: 'uma senha longa',
      acceptTerms: true,
      acceptPrivacy: true,
    })
    .expect(201)
  return response.body.tokens.accessToken as string
}

async function publishedCurriculum(courseId: string, slug: string) {
  await database.db.insert(curricula).values({
    id: randomUUID(),
    courseId,
    code: slug.replace('-', '.'),
    effectiveTerm: slug.replace('-', '.'),
    slug,
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
}

// Ids das turmas coletadas, pela chave natural
async function sectionId(subjectCode: string, sectionCode: string) {
  const [row] = await database.db
    .select({ id: classSections.id })
    .from(classSections)
    .where(
      and(
        eq(classSections.subjectCode, subjectCode),
        eq(classSections.sectionCode, sectionCode),
      ),
    )
  return row!.id
}

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
  source.fetch = vi.fn<SigaaSectionSource['fetch']>().mockResolvedValue(fixture)

  const course = await insertCourse(database.db, {
    sigaaId: '657484',
    slug: COURSE,
  })
  await publishedCurriculum(course.id, '2006-2')
  await publishedCurriculum(course.id, '2025-1')

  const { users: userRepo } = identityRepositories(database.db)
  const now = new Date()
  const adminId = randomUUID()
  await userRepo.insert({
    id: adminId,
    name: 'Admin',
    email: ADMIN.email,
    passwordHash: await new Argon2PasswordHasher().hash(ADMIN.password),
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  })
  await userRepo.addRole(adminId, 'ADMIN', null, now)
  const admin = bearer(
    (await http.post('/v1/auth/sign-in').send(ADMIN).expect(200)).body.tokens
      .accessToken,
  )
  await http
    .post('/v1/admin/terms')
    .set(admin)
    .send({ code: '2026.2', startsAt: '2026-08-10', endsAt: '2026-12-11' })
    .expect(201)
  await http
    .post(`/v1/terms/2026.2/courses/${COURSE}/collect`)
    .set(admin)
    .expect(200)

  anaToken = await signUp('ana@ufc.br')
  biaToken = await signUp('bia@ufc.br')
})

afterAll(async () => {
  await app?.close()
  await database?.stop()
})

describe('agendas de ponta a ponta', () => {
  const ID = randomUUID()
  const body = (items: { sectionId: string; color: string }[], extra = {}) => ({
    courseSlug: COURSE,
    curriculumSlug: '2006-2',
    term: '2026.2',
    name: 'Plano A',
    items,
    ...extra,
  })

  it('exige login e grava a agenda inteira pelo id do cliente', async () => {
    await http.get('/v1/me/schedules').expect(401)
    const algebra = await sectionId('SBL0056', '01')
    const calculo = await sectionId('SBL0057', '01')
    const created = await http
      .put(`/v1/me/schedules/${ID}`)
      .set(bearer(anaToken))
      .send(body([{ sectionId: algebra, color: 'blue' }]))
      .expect(200)
    expect(created.body).toMatchObject({
      id: ID,
      courseSlug: COURSE,
      curriculumSlug: '2006-2',
      term: '2026.2',
      items: [
        {
          subjectCode: 'SBL0056',
          subjectName: 'ÁLGEBRA LINEAR',
          sectionCode: '01',
          color: 'blue',
          changed: false,
          removed: false,
          slots: [
            { weekday: 1, startTime: '08:00', endTime: '10:00' },
            { weekday: 3, startTime: '08:00', endTime: '10:00' },
          ],
        },
      ],
    })
    const updated = await http
      .put(`/v1/me/schedules/${ID}`)
      .set(bearer(anaToken))
      .send(
        body([
          { sectionId: algebra, color: 'red' },
          { sectionId: calculo, color: 'lime' },
        ]),
      )
      .expect(200)
    expect(updated.body.items).toHaveLength(2)
    expect(updated.body.createdAt).toBe(created.body.createdAt)
  })

  it('recusa conflito, disciplina repetida e agenda de outra pessoa', async () => {
    const algebra = await sectionId('SBL0056', '01')
    // SBL0057-03 tem o mesmo horário de SBL0056-01
    const calculo03 = await sectionId('SBL0057', '03')
    const conflict = await http
      .put(`/v1/me/schedules/${randomUUID()}`)
      .set(bearer(anaToken))
      .send(
        body([
          { sectionId: algebra, color: 'red' },
          { sectionId: calculo03, color: 'lime' },
        ]),
      )
      .expect(409)
    expect(conflict.body.code).toBe('SCHEDULE_TIME_CONFLICT')
    await http
      .put(`/v1/me/schedules/${ID}`)
      .set(bearer(biaToken))
      .send(body([]))
      .expect(404)
    await http
      .put(`/v1/me/schedules/${randomUUID()}`)
      .set(bearer(anaToken))
      .send(body([], { curriculumSlug: '1999-1' }))
      .expect(404)
    expect(
      (await http.get('/v1/me/schedules').set(bearer(biaToken)).expect(200))
        .body,
    ).toEqual([])
  })

  it('avisa quando o SIGAA muda o horário ou tira a turma', async () => {
    const algebra = await sectionId('SBL0056', '01')
    await database.db
      .update(classSections)
      .set({ fingerprint: 'mudou', removedAt: new Date() })
      .where(eq(classSections.id, algebra))
    const list = await http
      .get(`/v1/me/schedules?course=${COURSE}&curriculum=2006-2&term=2026.2`)
      .set(bearer(anaToken))
      .expect(200)
    const item = (list.body as ScheduleView[])[0]!.items.find(
      (entry) => entry.sectionId === algebra,
    )
    expect(item).toMatchObject({ changed: true, removed: true })
  })

  it('importa as agendas locais sem duplicar, separadas por EC', async () => {
    const local = {
      schedules: [
        {
          id: randomUUID(),
          courseSlug: COURSE,
          curriculumSlug: '2025-1',
          term: '2026.2',
          name: 'Agenda local',
          items: [
            { subjectCode: 'ECO0046', sectionCode: '01', color: 'teal' },
            { subjectCode: 'SBL0082', sectionCode: '99', color: 'rose' },
          ],
        },
      ],
    }
    const first = await http
      .post('/v1/me/schedules/import')
      .set(bearer(anaToken))
      .send(local)
      .expect(200)
    expect(first.body.results[0]).toMatchObject({
      status: 'IMPORTED',
      notFound: [{ subjectCode: 'SBL0082', sectionCode: '99' }],
      schedule: {
        curriculumSlug: '2025-1',
        items: [{ subjectCode: 'ECO0046' }],
      },
    })
    const again = await http
      .post('/v1/me/schedules/import')
      .set(bearer(anaToken))
      .send(local)
      .expect(200)
    expect(again.body.results[0].status).toBe('ALREADY_IMPORTED')

    const byCurriculum = await http
      .get(`/v1/me/schedules?course=${COURSE}&curriculum=2025-1`)
      .set(bearer(anaToken))
      .expect(200)
    expect(byCurriculum.body).toHaveLength(1)
    expect(
      (await http.get('/v1/me/schedules').set(bearer(anaToken)).expect(200))
        .body,
    ).toHaveLength(2)
  })

  it('exclui a agenda, e a conta leva as agendas junto (LGPD)', async () => {
    await http
      .delete(`/v1/me/schedules/${ID}`)
      .set(bearer(biaToken))
      .expect(404)
    await http
      .delete(`/v1/me/schedules/${ID}`)
      .set(bearer(anaToken))
      .expect(204)
    const [ana] = await database.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, 'ana@ufc.br'))
    await database.db.delete(users).where(eq(users.id, ana!.id))
    expect(
      await database.db
        .select()
        .from(schedules)
        .where(eq(schedules.userId, ana!.id)),
    ).toEqual([])
  })
})
