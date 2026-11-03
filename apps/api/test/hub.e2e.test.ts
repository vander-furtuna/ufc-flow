import { randomUUID } from 'node:crypto'

import type { INestApplication } from '@nestjs/common'
import type { HubFeed, PostView } from '@ufc-flow/contracts'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { parseEnv } from '../src/config/env'
import { createApp } from '../src/create-app'
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
let moderator: Record<string, string>
let student: Record<string, string>

const COURSE = 'engenharia-de-computacao'
const OTHER = 'ciencia-da-computacao'
const ADMIN = { email: 'admin@ufc.br', password: 'senha do admin longa' }
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

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
  return bearer(response.body.tokens.accessToken as string)
}

const post = (overrides: Record<string, unknown> = {}) => ({
  type: 'NEWS',
  title: 'Laboratório recebe novos kits',
  summary: 'Kits para Microprocessadores',
  bodyMd: 'Os kits ficam **disponíveis** em dezembro.',
  coverFileId: null,
  externalUrl: null,
  status: 'PUBLISHED',
  pinned: false,
  startsAt: null,
  endsAt: null,
  deadlineAt: null,
  location: null,
  attributes: {},
  ...overrides,
})

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

  const course = await insertCourse(database.db, {
    sigaaId: '657484',
    slug: COURSE,
  })
  await insertCourse(database.db, { sigaaId: '657485', slug: OTHER })

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

  moderator = await signUp('moderadora@ufc.br')
  const requested = await http
    .post('/v1/moderator-requests')
    .set(moderator)
    .send({
      courseId: course.id,
      justification: 'Sou da coordenação e cuido dos avisos do curso.',
    })
    .expect(201)
  await http
    .post(`/v1/moderator-requests/${requested.body.id}/approve`)
    .set(admin)
    .send({})
    .expect(200)
  student = await signUp('ana@ufc.br')
})

afterAll(async () => {
  await app?.close()
  await database?.stop()
})

describe('hub de ponta a ponta', () => {
  let news: PostView

  it('moderador publica; aluno e anônimo não', async () => {
    await http.post(`/v1/courses/${COURSE}/hub/posts`).send(post()).expect(401)
    await http
      .post(`/v1/courses/${COURSE}/hub/posts`)
      .set(student)
      .send(post())
      .expect(403)
    const invalid = await http
      .post(`/v1/courses/${COURSE}/hub/posts`)
      .set(moderator)
      .send(post({ type: 'EVENT', attributes: { amountBrl: 10 } }))
      .expect(400)
    expect(invalid.body.code).toBe('VALIDATION_FAILED')

    const created = await http
      .post(`/v1/courses/${COURSE}/hub/posts`)
      .set(moderator)
      .send(post())
      .expect(201)
    news = created.body
    expect(news).toMatchObject({
      slug: 'laboratorio-recebe-novos-kits',
      status: 'PUBLISHED',
      author: { name: 'Ana Souza' },
      closed: false,
    })
    const again = await http
      .post(`/v1/courses/${COURSE}/hub/posts`)
      .set(moderator)
      .send(post())
      .expect(201)
    expect(again.body.slug).toBe('laboratorio-recebe-novos-kits-2')
    await http
      .delete(`/v1/hub/posts/${again.body.id}`)
      .set(moderator)
      .expect(204)
  })

  it('institucional só para admin, no hub de todos os cursos', async () => {
    const denied = await http
      .post('/v1/hub/posts')
      .set(moderator)
      .send(post({ title: 'Recesso de fim de ano' }))
      .expect(403)
    expect(denied.body.code).toBe('POST_INSTITUTIONAL_ADMIN_ONLY')
    await http
      .post('/v1/hub/posts')
      .set(admin)
      .send(post({ title: 'Recesso de fim de ano' }))
      .expect(201)
    const other = await http.get(`/v1/courses/${OTHER}/hub`).expect(200)
    expect((other.body as HubFeed).items.map((item) => item.title)).toEqual([
      'Recesso de fim de ano',
    ])
    await http
      .get(`/v1/courses/${OTHER}/hub/posts/recesso-de-fim-de-ano`)
      .expect(200)
  })

  it('feed com fixados, filtros, busca, rascunhos e prazos', async () => {
    const create = (body: Record<string, unknown>) =>
      http
        .post(`/v1/courses/${COURSE}/hub/posts`)
        .set(moderator)
        .send(post(body))
        .expect(201)
    const future = (days: number) =>
      new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    await create({
      type: 'CALL',
      title: 'Seleção de monitores',
      pinned: true,
      deadlineAt: future(10),
      attributes: { number: '12/2026', issuer: 'Coordenação' },
    })
    await create({
      type: 'EVENT',
      title: 'Semana de Engenharia',
      startsAt: future(15),
      endsAt: future(19),
      location: 'Bloco didático',
      attributes: { modality: 'IN_PERSON' },
    })
    await create({
      type: 'SCHOLARSHIP',
      title: 'Bolsa encerrada',
      deadlineAt: future(-3),
      attributes: { amountBrl: 700, vacancies: 2 },
    })
    await create({ title: 'Rascunho do edital', status: 'DRAFT' })

    const feed = (await http.get(`/v1/courses/${COURSE}/hub`).expect(200))
      .body as HubFeed
    expect(feed.pinned.map((item) => item.title)).toEqual([
      'Seleção de monitores',
    ])
    expect(feed.items.map((item) => item.title)).toEqual([
      'Bolsa encerrada',
      'Semana de Engenharia',
      'Recesso de fim de ano',
      'Laboratório recebe novos kits',
    ])
    expect(feed.items[0]).toMatchObject({ closed: true })
    expect(feed.items[0]).not.toHaveProperty('bodyMd')

    const page = (
      await http.get(`/v1/courses/${COURSE}/hub?limit=2`).expect(200)
    ).body as HubFeed
    const next = (
      await http
        .get(`/v1/courses/${COURSE}/hub?limit=2&cursor=${page.nextCursor}`)
        .expect(200)
    ).body as HubFeed
    expect(next.pinned).toEqual([])
    expect(next.items.map((item) => item.title)).toEqual([
      'Recesso de fim de ano',
      'Laboratório recebe novos kits',
    ])

    const upcoming = (
      await http
        .get(`/v1/courses/${COURSE}/hub?type=EVENT&upcoming=true`)
        .expect(200)
    ).body as HubFeed
    expect(upcoming.items.map((item) => item.title)).toEqual([
      'Semana de Engenharia',
    ])
    const search = (
      await http.get(`/v1/courses/${COURSE}/hub?q=LABORATORIO`).expect(200)
    ).body as HubFeed
    expect(search.items.map((item) => item.title)).toEqual([
      'Laboratório recebe novos kits',
    ])

    await http.get(`/v1/courses/${COURSE}/hub?status=DRAFT`).expect(403)
    const drafts = (
      await http
        .get(`/v1/courses/${COURSE}/hub?status=DRAFT`)
        .set(moderator)
        .expect(200)
    ).body as HubFeed
    expect(drafts.items.map((item) => item.title)).toEqual([
      'Rascunho do edital',
    ])
    await http
      .get(`/v1/courses/${COURSE}/hub/posts/rascunho-do-edital`)
      .set(student)
      .expect(404)

    const deadlines = await http
      .get(`/v1/courses/${COURSE}/hub/deadlines`)
      .expect(200)
    expect(deadlines.body.map((item: { title: string }) => item.title)).toEqual(
      ['Seleção de monitores', 'Semana de Engenharia'],
    )
    await http.get('/v1/courses/nada/hub').expect(404)
  })

  it('post completo, edição com o mesmo slug e novidades', async () => {
    const full = await http
      .get(`/v1/courses/${COURSE}/hub/posts/${news.slug}`)
      .expect(200)
    expect(full.body.bodyMd).toContain('**disponíveis**')

    const edited = await http
      .put(`/v1/hub/posts/${news.id}`)
      .set(moderator)
      .send(post({ title: 'Kits novos no laboratório' }))
      .expect(200)
    expect(edited.body).toMatchObject({
      slug: news.slug,
      title: 'Kits novos no laboratório',
      publishedAt: news.publishedAt,
    })
    await http
      .put(`/v1/hub/posts/${news.id}`)
      .set(student)
      .send(post())
      .expect(403)

    await http.get(`/v1/me/hub-reads/${COURSE}`).expect(401)
    const unread = await http
      .get(`/v1/me/hub-reads/${COURSE}`)
      .set(student)
      .expect(200)
    expect(unread.body.count).toBeGreaterThan(0)
    await http.put(`/v1/me/hub-reads/${COURSE}`).set(student).expect(204)
    const seen = await http
      .get(`/v1/me/hub-reads/${COURSE}`)
      .set(student)
      .expect(200)
    expect(seen.body).toEqual({ count: 0 })
  })
})
