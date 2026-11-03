import { randomUUID } from 'node:crypto'

import type { INestApplication } from '@nestjs/common'
import type { ManagedLinkPage, PublicLinkPage } from '@ufc-flow/contracts'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { parseEnv } from '../src/config/env'
import { createApp } from '../src/create-app'
import { curricula } from '../src/database/schema'
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
let postId: string

const COURSE = 'engenharia-de-computacao'
const OTHER = 'ciencia-da-computacao'
const ADMIN = { email: 'admin@ufc.br', password: 'senha do admin longa' }
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })
const base = `/v1/courses/${COURSE}/link-page`

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

const settings = (overrides: Record<string, unknown> = {}) => ({
  slug: 'eng-computacao-sobral',
  bio: 'UFC · Campus Sobral · links oficiais do curso',
  theme: 'CIANO',
  buttonStyle: 'SOFT',
  buttonShape: 'ROUNDED',
  titleFont: 'CLASH',
  isPublished: true,
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
  await database.db.insert(curricula).values({
    id: randomUUID(),
    courseId: course.id,
    code: '2006.2',
    effectiveTerm: '2006.2',
    slug: '2006-2',
    matrixName: 'Matriz',
    status: 'PUBLISHED',
    isCurrent: true,
    minTotalHours: 3600,
    mandatoryHours: 3000,
    optativeHours: 400,
    extensionHours: 0,
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
  moderator = await signUp('moderadora@ufc.br')
  const requested = await http
    .post('/v1/moderator-requests')
    .set(moderator)
    .send({
      courseId: course.id,
      justification: 'Sou da coordenação e cuido dos links do curso.',
    })
    .expect(201)
  await http
    .post(`/v1/moderator-requests/${requested.body.id}/approve`)
    .set(admin)
    .send({})
    .expect(200)
  student = await signUp('ana@ufc.br')

  postId = (
    await http
      .post(`/v1/courses/${COURSE}/hub/posts`)
      .set(moderator)
      .send({
        type: 'CALL',
        title: 'Seleção de monitores',
        summary: null,
        bodyMd: 'Inscrições pelo SIGAA.',
        coverFileId: null,
        externalUrl: null,
        status: 'PUBLISHED',
        pinned: false,
        startsAt: null,
        endsAt: null,
        deadlineAt: new Date(Date.now() + 864e6).toISOString(),
        location: null,
        attributes: {},
      })
      .expect(201)
  ).body.id
})

afterAll(async () => {
  await app?.close()
  await database?.stop()
})

describe('página de links de ponta a ponta', () => {
  let page: ManagedLinkPage

  it('nasce despublicada para quem modera; aluno não edita', async () => {
    await http.get(base).expect(401)
    await http.get(base).set(student).expect(403)
    page = (await http.get(base).set(moderator).expect(200)).body
    expect(page).toMatchObject({ slug: COURSE, isPublished: false, links: [] })
    await http.get(`/v1/link-pages/${COURSE}`).expect(404)
  })

  it('monta a página: aparência, seção, links, destaque e redes', async () => {
    page = (await http.put(base).set(moderator).send(settings()).expect(200))
      .body
    expect(page.slug).toBe('eng-computacao-sobral')
    page = (
      await http
        .post(`${base}/sections`)
        .set(moderator)
        .send({ title: 'Acadêmico' })
        .expect(201)
    ).body
    const section = page.sections[0]!.id
    const link = (body: Record<string, unknown>) =>
      http.post(`${base}/links`).set(moderator).send(body).expect(201)
    await link({
      kind: 'URL',
      label: 'SIGAA',
      url: 'https://si3.ufc.br',
      sectionId: section,
    })
    await link({
      kind: 'INTERNAL',
      label: 'Grade interativa',
      internalTarget: 'GRADE',
      sectionId: section,
    })
    await link({
      kind: 'POST',
      label: 'Inscrições para monitoria',
      postId,
      isFeatured: true,
      badge: 'NEW',
    })
    const invalid = await http
      .post(`${base}/links`)
      .set(moderator)
      .send({ kind: 'URL', label: 'Sem alvo' })
      .expect(400)
    expect(invalid.body.code).toBe('VALIDATION_FAILED')
    page = (
      await http
        .post(`${base}/social-links`)
        .set(moderator)
        .send({ network: 'EMAIL', url: 'coord@ufc.br' })
        .expect(201)
    ).body
    expect(page.socialLinks[0]?.url).toBe('mailto:coord@ufc.br')
    expect(page.links.map((item) => item.label)).toEqual([
      'Inscrições para monitoria',
      'SIGAA',
      'Grade interativa',
    ])
  })

  it('pública com cache, clique contado e redirecionado, visitas e prévia', async () => {
    const response = await http
      .get('/v1/link-pages/eng-computacao-sobral')
      .expect(200)
    expect(response.headers['cache-control']).toBe('public, max-age=60')
    const open = response.body as PublicLinkPage
    expect(open).toMatchObject({
      course: { slug: COURSE },
      sections: [{ title: 'Acadêmico' }],
    })
    expect(open.links.map((item) => item.label)).toEqual([
      'Inscrições para monitoria',
      'SIGAA',
      'Grade interativa',
    ])

    const go = (index: number, src = '') =>
      http
        .get(
          `/v1/link-pages/eng-computacao-sobral/go/${open.links[index]!.id}${src}`,
        )
        .expect(302)
    expect((await go(0)).headers.location).toBe(
      `/${COURSE}/hub/selecao-de-monitores`,
    )
    expect((await go(1, '?src=qr')).headers.location).toBe('https://si3.ufc.br')
    expect((await go(1)).headers.location).toBe('https://si3.ufc.br')
    expect((await go(2, '?src=hub')).headers.location).toBe(`/${COURSE}/2006-2`)
    await http
      .get(`/v1/link-pages/eng-computacao-sobral/go/${randomUUID()}`)
      .expect(404)
    await http
      .post('/v1/link-pages/eng-computacao-sobral/views')
      .send({ source: 'QR' })
      .expect(204)

    const stats = await http.get(`${base}/stats`).set(moderator).expect(200)
    expect(stats.body.links[0]).toMatchObject({
      label: 'SIGAA',
      clicks: 2,
      bySource: { PAGE: 1, QR: 1 },
    })
    expect(stats.body.views).toEqual([
      expect.objectContaining({ source: 'QR', count: 1 }),
    ])
    const managed = (await http.get(base).set(moderator).expect(200))
      .body as ManagedLinkPage
    expect(managed.links.find((item) => item.label === 'SIGAA')?.clicks7d).toBe(
      2,
    )

    const preview = await http
      .get(`/v1/courses/${COURSE}/link-page/preview`)
      .expect(200)
    expect(preview.body.slug).toBe('eng-computacao-sobral')
    expect(preview.body.links).toHaveLength(3)
  })

  it('ordem em lote, slug ocupado e despublicar', async () => {
    const [featured, sigaa, grade] = page.links
    page = (
      await http
        .put(`${base}/order`)
        .set(moderator)
        .send({
          sections: page.sections.map((section) => section.id),
          links: [
            { id: featured!.id, sectionId: null },
            { id: grade!.id, sectionId: page.sections[0]!.id },
            { id: sigaa!.id, sectionId: page.sections[0]!.id },
          ],
          socialLinks: page.socialLinks.map((social) => social.id),
        })
        .expect(200)
    ).body
    expect(page.links.map((item) => item.label)).toEqual([
      'Inscrições para monitoria',
      'Grade interativa',
      'SIGAA',
    ])
    const mismatch = await http
      .put(`${base}/order`)
      .set(moderator)
      .send({ sections: [], links: [], socialLinks: [] })
      .expect(400)
    expect(mismatch.body.code).toBe('LINK_ORDER_MISMATCH')

    await http.get(`/v1/courses/${OTHER}/link-page`).set(admin).expect(200)
    const taken = await http
      .put(`/v1/courses/${OTHER}/link-page`)
      .set(admin)
      .send(settings())
      .expect(409)
    expect(taken.body.code).toBe('LINK_PAGE_SLUG_TAKEN')

    await http
      .put(base)
      .set(moderator)
      .send(settings({ isPublished: false }))
      .expect(200)
    await http.get('/v1/link-pages/eng-computacao-sobral').expect(404)
  })
})
