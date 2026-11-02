import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { parseEnv } from '../src/config/env'
import { createApp } from '../src/create-app'
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
let adminToken: string
let strangerToken: string
let fetchSections: ReturnType<typeof vi.fn<SigaaSectionSource['fetch']>>

const ADMIN = { email: 'admin@ufc.br', password: 'senha do admin longa' }
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
  // A coleta de verdade vai à internet: a fonte devolve o fixture
  const source = app.get<SigaaSectionSource>(SIGAA_SECTION_SOURCE)
  fetchSections = vi
    .fn<SigaaSectionSource['fetch']>()
    .mockResolvedValue(fixture)
  source.fetch = fetchSections

  await insertCourse(database.db, {
    sigaaId: '657484',
    slug: 'engenharia-de-computacao',
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
  adminToken = (await http.post('/v1/auth/sign-in').send(ADMIN).expect(200))
    .body.tokens.accessToken
  strangerToken = (
    await http
      .post('/v1/auth/sign-up')
      .send({
        name: 'Ana Souza',
        email: 'visitante@ufc.br',
        password: 'uma senha longa',
        acceptTerms: true,
        acceptPrivacy: true,
      })
      .expect(201)
  ).body.tokens.accessToken
})

afterAll(async () => {
  await app?.close()
  await database?.stop()
})

describe('turmas de ponta a ponta', () => {
  it('admin cadastra e marca o semestre vigente', async () => {
    await http.get('/v1/terms/current').expect(404)
    const term = {
      code: '2026.2',
      startsAt: '2026-08-10',
      endsAt: '2026-12-11',
    }
    await http.post('/v1/admin/terms').send(term).expect(401)
    await http
      .post('/v1/admin/terms')
      .set(bearer(strangerToken))
      .send(term)
      .expect(403)
    await http
      .post('/v1/admin/terms')
      .set(bearer(adminToken))
      .send({ ...term, endsAt: '2026-01-01' })
      .expect(400)
    await http
      .post('/v1/admin/terms')
      .set(bearer(adminToken))
      .send(term)
      .expect(201)
    await http
      .post('/v1/admin/terms')
      .set(bearer(adminToken))
      .send(term)
      .expect(409)
    await http
      .post('/v1/admin/terms/2026.2/make-current')
      .set(bearer(adminToken))
      .expect(200)
    const current = await http.get('/v1/terms/current').expect(200)
    expect(current.body).toMatchObject({ code: '2026.2', isCurrent: true })
    await http
      .patch('/v1/admin/terms/2026.2')
      .set(bearer(adminToken))
      .send({ startsAt: '2026-08-17', endsAt: '2026-12-18' })
      .expect(200)
    const terms = await http.get('/v1/terms').expect(200)
    expect(terms.body).toEqual([
      expect.objectContaining({ code: '2026.2', startsAt: '2026-08-17' }),
    ])
  })

  it('coleta manual e leitura pública das turmas do curso', async () => {
    const path = '/v1/terms/2026.2/courses/engenharia-de-computacao'
    await http.post(`${path}/collect`).expect(401)
    await http.post(`${path}/collect`).set(bearer(strangerToken)).expect(403)
    const run = await http
      .post(`${path}/collect`)
      .set(bearer(adminToken))
      .expect(200)
    expect(run.body).toMatchObject({
      status: 'SUCCESS',
      trigger: 'MANUAL',
      sectionsSeen: 9,
    })
    expect(fetchSections).toHaveBeenCalledWith('657484', 2026, 2)

    const response = await http.get(`${path}/sections`).expect(200)
    expect(response.headers['cache-control']).toContain('max-age=60')
    expect(response.body.collectedAt).toBe(run.body.finishedAt)
    expect(
      response.body.subjects.map((item: { code: string }) => item.code),
    ).toContain('SBL0082')
    const microprocessors = response.body.subjects.find(
      (item: { code: string }) => item.code === 'SBL0082',
    )
    expect(microprocessors.sections).toHaveLength(3)

    await http.get('/v1/terms/2026.2/courses/nao-existe/sections').expect(404)
    await http.get('/v1/terms/2026-2/courses/x/sections').expect(400)
    await http
      .delete('/v1/admin/terms/2026.2')
      .set(bearer(adminToken))
      .expect(409)
  })
})
