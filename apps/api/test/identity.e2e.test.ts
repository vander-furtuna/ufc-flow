import { randomUUID } from 'node:crypto'

import type { INestApplication } from '@nestjs/common'
import { problemType } from '@ufc-flow/contracts'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { parseEnv } from '../src/config/env'
import { createApp } from '../src/create-app'
import { courseModerators } from '../src/database/schema'
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
let courseId: string

const ADMIN = { email: 'admin@ufc.br', password: 'senha do admin longa' }
const justification = 'Sou do centro acadêmico e mantenho a grade atualizada.'

const signUp = (email: string, password = 'uma senha longa') =>
  http.post('/v1/auth/sign-up').send({
    name: 'Ana Souza',
    email,
    password,
    acceptTerms: true,
    acceptPrivacy: true,
  })

const signIn = (email: string, password: string) =>
  http.post('/v1/auth/sign-in').send({ email, password })

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

beforeAll(async () => {
  database = await startDatabase()
  app = await createApp(
    parseEnv({
      NODE_ENV: 'test',
      DATABASE_URL: database.url,
      JWT_SECRET: 'segredo-dos-testes-e2e-com-32-caracteres',
      WEB_URL: 'http://localhost:3000',
    }),
    { logger: false },
  )
  await app.init()
  http = request(app.getHttpServer())

  courseId = (await insertCourse(database.db)).id
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
})

afterAll(async () => {
  await app?.close()
  await database?.stop()
})

describe('conta e sessão', () => {
  it('cria conta, entra, renova e sai', async () => {
    const created = await signUp('fluxo@ufc.br').expect(201)
    expect(created.body.user).toMatchObject({
      email: 'fluxo@ufc.br',
      roles: [],
      moderatedCourses: [],
    })
    expect(created.body.tokens.tokenType).toBe('Bearer')

    const session = await signIn('FLUXO@ufc.br', 'uma senha longa').expect(200)
    const me = await http
      .get('/v1/me')
      .set(bearer(session.body.tokens.accessToken))
      .expect(200)
    expect(me.body.id).toBe(created.body.user.id)

    const renewed = await http
      .post('/v1/auth/refresh')
      .send({ refreshToken: session.body.tokens.refreshToken })
      .expect(200)
    expect(renewed.body.refreshToken).not.toBe(session.body.tokens.refreshToken)

    await http
      .post('/v1/auth/sign-out')
      .send({ refreshToken: renewed.body.refreshToken })
      .expect(204)
    const after = await http
      .post('/v1/auth/refresh')
      .send({ refreshToken: renewed.body.refreshToken })
      .expect(401)
    expect(after.body.code).toBe('REFRESH_TOKEN_REUSED')
  })

  it('reusar um token girado derruba a família', async () => {
    const { body } = await signUp('reuso@ufc.br').expect(201)
    const renewed = await http
      .post('/v1/auth/refresh')
      .send({ refreshToken: body.tokens.refreshToken })
      .expect(200)
    await http
      .post('/v1/auth/refresh')
      .send({ refreshToken: body.tokens.refreshToken })
      .expect(401)
    const current = await http
      .post('/v1/auth/refresh')
      .send({ refreshToken: renewed.body.refreshToken })
      .expect(401)
    expect(current.body.code).toBe('REFRESH_TOKEN_REUSED')
  })

  it('erros em Problem Details', async () => {
    await signUp('duplicado@ufc.br').expect(201)
    const duplicated = await signUp('duplicado@ufc.br').expect(409)
    expect(duplicated.headers['content-type']).toMatch(
      /application\/problem\+json/,
    )
    expect(duplicated.body).toEqual({
      type: problemType('USER_EMAIL_TAKEN'),
      title: 'Conflito',
      status: 409,
      code: 'USER_EMAIL_TAKEN',
      detail: 'Este e-mail já tem conta',
      instance: '/v1/auth/sign-up',
    })

    const invalid = await http
      .post('/v1/auth/sign-up')
      .send({ name: 'A', email: 'x', password: '1' })
      .expect(400)
    expect(invalid.body.code).toBe('VALIDATION_FAILED')
    expect(
      invalid.body.errors.map((error: { path: string[] }) => error.path[0]),
    ).toEqual(['name', 'email', 'password', 'acceptTerms', 'acceptPrivacy'])

    expect(
      (await signIn('duplicado@ufc.br', 'senha errada').expect(401)).body.code,
    ).toBe('INVALID_CREDENTIALS')
    expect((await http.get('/v1/me').expect(401)).body.code).toBe(
      'AUTHENTICATION_REQUIRED',
    )
    expect((await http.get('/v1/nada').expect(404)).body.code).toBe('NOT_FOUND')
  })

  it('limita as tentativas de login por e-mail e IP', async () => {
    await signUp('limite@ufc.br').expect(201)
    for (let attempt = 0; attempt < 5; attempt++) {
      await signIn('limite@ufc.br', 'errada').expect(401)
    }
    const blocked = await signIn('limite@ufc.br', 'uma senha longa').expect(429)
    expect(blocked.body.code).toBe('TOO_MANY_REQUESTS')
    // Outro e-mail do mesmo IP continua entrando
    await signIn('fluxo@ufc.br', 'uma senha longa').expect(200)
  })
})

describe('moderação', () => {
  it('pede, o admin aprova e a pessoa passa a moderar o curso', async () => {
    const user = await signUp('moderadora@ufc.br').expect(201)
    const userToken = user.body.tokens.accessToken
    const admin = await signIn(ADMIN.email, ADMIN.password).expect(200)
    const adminToken = admin.body.tokens.accessToken

    const created = await http
      .post('/v1/moderator-requests')
      .set(bearer(userToken))
      .send({ courseId, justification })
      .expect(201)
    expect(created.body).toMatchObject({
      status: 'PENDING',
      course: { id: courseId },
    })

    await http
      .post('/v1/moderator-requests')
      .set(bearer(userToken))
      .send({ courseId, justification })
      .expect(409)
    await http.get('/v1/moderator-requests').set(bearer(userToken)).expect(403)

    const queue = await http
      .get('/v1/moderator-requests?status=PENDING&limit=10')
      .set(bearer(adminToken))
      .expect(200)
    expect(queue.body.items.map((item: { id: string }) => item.id)).toContain(
      created.body.id,
    )

    await http
      .post(`/v1/moderator-requests/${created.body.id}/approve`)
      .set(bearer(userToken))
      .send({})
      .expect(403)
    const approved = await http
      .post(`/v1/moderator-requests/${created.body.id}/approve`)
      .set(bearer(adminToken))
      .send({ note: 'Bem-vinda' })
      .expect(200)
    expect(approved.body).toMatchObject({
      status: 'APPROVED',
      reviewNote: 'Bem-vinda',
    })

    const me = await http.get('/v1/me').set(bearer(userToken)).expect(200)
    expect(
      me.body.moderatedCourses.map((course: { id: string }) => course.id),
    ).toEqual([courseId])
    const rows = await database.db
      .select()
      .from(courseModerators)
      .where(eq(courseModerators.userId, user.body.user.id))
    expect(rows).toHaveLength(1)

    const mine = await http
      .get('/v1/me/moderator-requests')
      .set(bearer(userToken))
      .expect(200)
    expect(mine.body[0].status).toBe('APPROVED')
  })

  it('valida id e cursor', async () => {
    const admin = await signIn(ADMIN.email, ADMIN.password).expect(200)
    const token = admin.body.tokens.accessToken
    expect(
      (
        await http
          .post('/v1/moderator-requests/nao-e-uuid/approve')
          .set(bearer(token))
          .send({})
          .expect(400)
      ).body.code,
    ).toBe('VALIDATION_FAILED')
    expect(
      (
        await http
          .get('/v1/moderator-requests?cursor=@@')
          .set(bearer(token))
          .expect(400)
      ).body.code,
    ).toBe('INVALID_CURSOR')
  })
})

describe('redefinição de senha pelo admin', () => {
  it('o admin gera o link e a pessoa troca a senha', async () => {
    const user = await signUp('esqueci@ufc.br').expect(201)
    const admin = await signIn(ADMIN.email, ADMIN.password).expect(200)
    const link = await http
      .post(`/v1/admin/users/${user.body.user.id}/password-reset-links`)
      .set(bearer(admin.body.tokens.accessToken))
      .expect(201)
    const token = new URL(link.body.url).searchParams.get('token')!
    expect(link.body.url).toMatch(
      /^http:\/\/localhost:3000\/redefinir-senha\?token=/,
    )

    await http
      .post('/v1/auth/password-reset')
      .send({ token, password: 'senha nova e longa' })
      .expect(204)
    await http
      .post('/v1/auth/refresh')
      .send({ refreshToken: user.body.tokens.refreshToken })
      .expect(401)
    await signIn('esqueci@ufc.br', 'senha nova e longa').expect(200)
    expect(
      (
        await http
          .post('/v1/auth/password-reset')
          .send({ token, password: 'outra senha longa' })
          .expect(400)
      ).body.code,
    ).toBe('PASSWORD_RESET_TOKEN_USED')
  })

  it('só admin gera link', async () => {
    const user = await signUp('nao-admin@ufc.br').expect(201)
    await http
      .post(`/v1/admin/users/${user.body.user.id}/password-reset-links`)
      .set(bearer(user.body.tokens.accessToken))
      .expect(403)
  })
})

describe('catálogo, saúde e documentação', () => {
  it('lista os cursos ativos', async () => {
    const { body } = await http.get('/v1/courses').expect(200)
    expect(body.map((course: { id: string }) => course.id)).toContain(courseId)
  })

  it('a saúde confere o banco', async () => {
    expect((await http.get('/v1/health').expect(200)).body).toEqual({
      status: 'ok',
      database: 'ok',
    })
  })

  it('serve o Swagger e o openapi.json', async () => {
    await http.get('/docs').expect(200)
    const { body } = await http.get('/docs/openapi.json').expect(200)
    expect(body.paths['/v1/auth/sign-in']).toBeDefined()
    expect(body.components.schemas.ProblemDetails).toBeDefined()
  })
})
