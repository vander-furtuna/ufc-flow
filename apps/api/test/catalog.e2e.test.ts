import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

import type { INestApplication } from '@nestjs/common'
import {
  curriculumImportV1Schema,
  type CurriculumImportV1,
  type ManagedCurriculum,
} from '@ufc-flow/contracts'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { parseEnv } from '../src/config/env'
import { createApp } from '../src/create-app'
import { sigaaCourses } from '../src/database/schema'
import { identityRepositories } from '../src/modules/identity/infrastructure/persistence/drizzle-identity'
import { Argon2PasswordHasher } from '../src/modules/identity/infrastructure/security/security-adapters'
import { startDatabase, type TestDatabase } from './support/database'

let database: TestDatabase
let app: INestApplication
let http: ReturnType<typeof request>
let adminToken: string
let moderatorToken: string
let strangerToken: string

// EC real de Eng. de Computação 2006.2, com os 114 componentes do SIGAA
const fixture = JSON.parse(
  readFileSync(
    new URL(
      '../../../packages/contracts/fixtures/engenharia-de-computacao-2006-2.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as CurriculumImportV1

const ADMIN = { email: 'admin@ufc.br', password: 'senha do admin longa' }
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

async function account(email: string): Promise<string> {
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

beforeAll(async () => {
  database = await startDatabase()
  app = await createApp(
    parseEnv({
      NODE_ENV: 'test',
      DATABASE_URL: database.url,
      JWT_SECRET: 'segredo-dos-testes-e2e-com-32-caracteres',
      SIGAA_SYNC_ENABLED: 'false',
    }),
    { logger: false },
  )
  await app.init()
  http = request(app.getHttpServer())

  // Catálogo do SIGAA já lido (a leitura de verdade vai à internet)
  await database.db.insert(sigaaCourses).values({
    sigaaId: '657484',
    name: 'ENGENHARIA DE COMPUTAÇÃO',
    city: 'SOBRAL',
    modality: 'IN_PERSON',
    unitAcronym: 'CUFCSOBRAL',
    unitName: 'CAMPUS DA UFC EM SOBRAL',
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
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
  moderatorToken = await account('moderadora@ufc.br')
  strangerToken = await account('visitante@ufc.br')
})

afterAll(async () => {
  await app?.close()
  await database?.stop()
})

describe('catálogo de ponta a ponta', () => {
  let courseId: string
  let curriculumId: string

  it('admin cria o curso do catálogo do SIGAA', async () => {
    await http.post('/v1/admin/courses').send({}).expect(401)
    const input = {
      sigaaId: '657484',
      slug: 'engenharia-de-computacao',
      name: 'Engenharia de Computação',
      icon: 'cpu',
    }
    await http
      .post('/v1/admin/courses')
      .set(bearer(moderatorToken))
      .send(input)
      .expect(403)
    const created = await http
      .post('/v1/admin/courses')
      .set(bearer(adminToken))
      .send(input)
      .expect(201)
    courseId = created.body.id
    expect(created.body.campus).toMatchObject({ slug: 'sobral' })

    // A moderadora pede e o admin aprova
    const requested = await http
      .post('/v1/moderator-requests')
      .set(bearer(moderatorToken))
      .send({
        courseId,
        justification: 'Sou do centro acadêmico e mantenho a grade atualizada.',
      })
      .expect(201)
    await http
      .post(`/v1/moderator-requests/${requested.body.id}/approve`)
      .set(bearer(adminToken))
      .send({})
      .expect(200)
  })

  it('a extensão envia, a moderadora revisa e publica', async () => {
    const invalid = await http
      .post('/v1/ingestion/curriculum-imports')
      .set(bearer(moderatorToken))
      .send({ ...fixture, schemaVersion: 2 })
      .expect(400)
    expect(invalid.body.code).toBe('VALIDATION_FAILED')
    await http
      .post('/v1/ingestion/curriculum-imports')
      .set(bearer(strangerToken))
      .send(fixture)
      .expect(403)

    const sent = await http
      .post('/v1/ingestion/curriculum-imports')
      .set(bearer(moderatorToken))
      .send(fixture)
      .expect(201)
    expect(sent.body).toMatchObject({
      status: 'APPLIED',
      source: 'EXTENSION',
      subjectCount: 114,
      course: { id: courseId, slug: 'engenharia-de-computacao' },
    })
    curriculumId = sent.body.curriculum.id

    await http
      .get(`/v1/manage/curricula/${curriculumId}`)
      .set(bearer(strangerToken))
      .expect(403)
    let managed: ManagedCurriculum = (
      await http
        .get(`/v1/manage/curricula/${curriculumId}`)
        .set(bearer(moderatorToken))
        .expect(200)
    ).body
    expect(managed).toMatchObject({ status: 'DRAFT', locked: false })
    expect(managed.subjects).toHaveLength(114)

    // Resolve o que barra a publicação
    for (const point of managed.reviewPoints) {
      if (
        point.resolution !== null ||
        point.type === 'EQUIVALENCES_SUGGESTED'
      ) {
        continue
      }
      const resolution =
        point.type === 'UNKNOWN_REQUIREMENT_CODE'
          ? 'ACKNOWLEDGED'
          : 'KEEP_CATALOG'
      managed = (
        await http
          .post(
            `/v1/ingestion/curriculum-imports/${sent.body.id}/review-points/${encodeURIComponent(point.key)}/resolve`,
          )
          .set(bearer(moderatorToken))
          .send({ resolution })
          .expect(200)
      ).body
    }
    expect(managed.publicationCheck.canPublish).toBe(true)

    await http
      .post(`/v1/manage/curricula/${curriculumId}/publish`)
      .set(bearer(moderatorToken))
      .expect(200)
    const current = await http
      .post(`/v1/manage/curricula/${curriculumId}/make-current`)
      .set(bearer(moderatorToken))
      .expect(200)
    expect(current.body).toMatchObject({ status: 'PUBLISHED', isCurrent: true })
  })

  it('a grade pública sai da API, com cache', async () => {
    const list = await http.get('/v1/courses').expect(200)
    expect(list.headers['cache-control']).toContain('max-age=60')
    expect(list.body).toEqual([
      {
        id: courseId,
        slug: 'engenharia-de-computacao',
        name: 'Engenharia de Computação',
      },
    ])

    const course = await http
      .get('/v1/courses/engenharia-de-computacao')
      .expect(200)
    expect(course.body.curricula).toEqual([
      expect.objectContaining({ slug: '2006-2', isCurrent: true }),
    ])

    const path = '/v1/courses/engenharia-de-computacao/curricula/2006-2'
    const curriculum = await http.get(path).expect(200)
    expect(curriculum.body.subjects).toHaveLength(114)
    expect(
      curriculum.body.branches.map((branch: { name: string }) => branch.name),
    ).toEqual([
      'Ciências de Computação',
      'Automação e Controle',
      'Telecomunicações',
    ])
    // Os OU do SIGAA chegam preservados
    expect(JSON.stringify(curriculum.body.subjects)).toContain('"kind":"or"')

    const etag = curriculum.headers.etag as string
    expect(etag).toBeTruthy()
    await http.get(path).set('If-None-Match', etag).expect(304)

    await http.get('/v1/courses/nao-existe').expect(404)
    await http
      .get('/v1/courses/engenharia-de-computacao/curricula/2099-1')
      .expect(404)
    const known = fixture.subjects[0]!.code
    const subjects = await http
      .get(`/v1/subjects?codes=${known},XYZ0001`)
      .expect(200)
    expect(subjects.body.map((item: { code: string }) => item.code)).toEqual([
      known,
    ])
    await http.get('/v1/subjects?codes=nada').expect(400)
    const sigaa = await http.get('/v1/sigaa-courses').expect(200)
    expect(sigaa.body[0]).toMatchObject({
      flowCourseId: courseId,
      removed: false,
    })
  })

  it('exporta, reimporta e lista as importações', async () => {
    const exported = await http
      .get(`/v1/manage/curricula/${curriculumId}/export`)
      .set(bearer(moderatorToken))
      .expect(200)
    expect(curriculumImportV1Schema.safeParse(exported.body).success).toBe(true)

    const again = await http
      .post('/v1/ingestion/curriculum-imports?source=UPLOAD')
      .set(bearer(moderatorToken))
      .send(exported.body)
      .expect(201)
    expect(again.body).toMatchObject({
      status: 'RECEIVED',
      source: 'UPLOAD',
      pendingReason: 'DIFF_REVIEW',
    })
    const detail = await http
      .get(`/v1/ingestion/curriculum-imports/${again.body.id}`)
      .set(bearer(moderatorToken))
      .expect(200)
    expect(detail.body.diff.subjects).toEqual({
      added: [],
      removed: [],
      changed: [],
    })
    await http
      .post(`/v1/ingestion/curriculum-imports/${again.body.id}/discard`)
      .set(bearer(moderatorToken))
      .expect(200)

    const page = await http
      .get('/v1/ingestion/curriculum-imports?limit=1')
      .set(bearer(adminToken))
      .expect(200)
    expect(page.body.items).toHaveLength(1)
    expect(page.body.nextCursor).not.toBeNull()
    const managedCourses = await http
      .get('/v1/manage/courses')
      .set(bearer(moderatorToken))
      .expect(200)
    expect(managedCourses.body).toHaveLength(1)
  })
})
