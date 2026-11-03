import { randomUUID } from 'node:crypto'

import type { INestApplication } from '@nestjs/common'
import type { MessageView, ReportQueueItem } from '@ufc-flow/contracts'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { parseEnv } from '../src/config/env'
import { createApp } from '../src/create-app'
import { curricula, notifications } from '../src/database/schema'
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
let moderatorId: string
const students: { headers: Record<string, string>; id: string }[] = []

const COURSE = 'engenharia-de-computacao'
const ADMIN = { email: 'admin@ufc.br', password: 'senha do admin longa' }
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })
const base = `/v1/courses/${COURSE}/forum/messages`

async function signUp(email: string, name: string) {
  const response = await http
    .post('/v1/auth/sign-up')
    .send({
      name,
      email,
      password: 'uma senha longa',
      acceptTerms: true,
      acceptPrivacy: true,
    })
    .expect(201)
  return {
    headers: bearer(response.body.tokens.accessToken as string),
    id: response.body.user.id as string,
  }
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
      FORUM_RATE_BURST: '10',
    }),
    { logger: false },
  )
  await app.init()
  http = request(app.getHttpServer())

  const course = await insertCourse(database.db, {
    sigaaId: '657484',
    slug: COURSE,
  })
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
  const mod = await signUp('moderadora@ufc.br', 'Moderadora')
  moderator = mod.headers
  moderatorId = mod.id
  const requested = await http
    .post('/v1/moderator-requests')
    .set(moderator)
    .send({
      courseId: course.id,
      justification: 'Sou da coordenação e cuido do fórum do curso.',
    })
    .expect(201)
  await http
    .post(`/v1/moderator-requests/${requested.body.id}/approve`)
    .set(admin)
    .send({})
    .expect(200)

  for (const [index, name] of ['Rafael', 'Bruno', 'Carla', 'Diego'].entries()) {
    const student = await signUp(`${name.toLowerCase()}@ufc.br`, name)
    await http
      .post('/v1/me/enrollments')
      .set(student.headers)
      .send({
        courseSlug: COURSE,
        curriculumSlug: '2006-2',
        registrationNumber: `51234${index}`,
        entryTerm: '2023.1',
      })
      .expect(201)
    students.push(student)
  }
})

afterAll(async () => {
  await app?.close()
  await database?.stop()
})

describe('moderação do fórum de ponta a ponta', () => {
  let message: MessageView

  it('3 denúncias de pessoas diferentes ocultam a mensagem', async () => {
    const [rafael, bruno, carla, diego] = students
    message = (
      await http
        .post(base)
        .set(rafael!.headers)
        .send({ content: 'O número da monitora é 9999-0000' })
        .expect(201)
    ).body
    await http
      .post(`/v1/forum/messages/${message.id}/replies`)
      .set(bruno!.headers)
      .send({ content: 'Não faz isso' })
      .expect(201)
    const report = (who: Record<string, string>, reason: string) =>
      http
        .post(`/v1/forum/messages/${message.id}/reports`)
        .set(who)
        .send({ reason })
    await report(rafael!.headers, 'SPAM').expect(403)
    await report(bruno!.headers, 'PERSONAL_DATA').expect(204)
    const again = await report(bruno!.headers, 'SPAM').expect(409)
    expect(again.body.code).toBe('FORUM_ALREADY_REPORTED')
    await report(carla!.headers, 'HARASSMENT').expect(204)
    await report(diego!.headers, 'PERSONAL_DATA').expect(204)

    // Para os outros, com resposta, vira aviso; para a moderação, aparece
    const forDiego = await http.get(base).set(diego!.headers).expect(200)
    expect(
      forDiego.body.items.find((m: MessageView) => m.id === message.id),
    ).toMatchObject({ status: 'HIDDEN', content: null })

    await http.get('/v1/moderation/reports').set(bruno!.headers).expect(403)
    const queue = await http
      .get('/v1/moderation/reports')
      .set(moderator)
      .expect(200)
    expect(queue.body).toEqual([
      expect.objectContaining({
        messageId: message.id,
        autoHidden: true,
        reportCount: 3,
        snapshot: 'O número da monitora é 9999-0000',
        author: expect.objectContaining({ name: 'Rafael' }),
      } satisfies Partial<ReportQueueItem>),
    ])
    expect(
      (await http.get('/v1/moderation/summary').set(admin).expect(200)).body,
    ).toEqual({ openReports: 1, activeRestrictions: 0, pendingRequests: 0 })
  })

  it('remover com a categoria pública e silenciar o autor', async () => {
    const [rafael, , carla] = students
    const removed = await http
      .post(`/v1/forum/messages/${message.id}/moderation`)
      .set(moderator)
      .send({
        action: 'REMOVE',
        reason: 'Telefone da monitora',
        category: 'PERSONAL_DATA',
      })
      .expect(200)
    expect(removed.body).toMatchObject({
      status: 'REMOVED',
      removedBy: 'MODERATION',
      removalCategory: 'PERSONAL_DATA',
    })
    const conversation = await http
      .get(`/v1/forum/messages/${message.id}`)
      .set(carla!.headers)
      .expect(200)
    expect(conversation.body.message).toMatchObject({
      content: null,
      removalCategory: 'PERSONAL_DATA',
    })
    expect(
      (await http.get('/v1/moderation/reports').set(moderator).expect(200))
        .body,
    ).toEqual([])

    const staff = await http
      .post('/v1/moderation/restrictions')
      .set(admin)
      .send({
        userId: moderatorId,
        courseSlug: COURSE,
        type: 'BAN',
        reason: 'Teste',
        days: null,
      })
      .expect(403)
    expect(staff.body.code).toBe('FORUM_CANNOT_RESTRICT_STAFF')

    const mute = await http
      .post('/v1/moderation/restrictions')
      .set(moderator)
      .send({
        userId: rafael!.id,
        courseSlug: COURSE,
        type: 'MUTE',
        reason: 'Dados pessoais de colega',
        days: 7,
      })
      .expect(201)
    expect(mute.body).toMatchObject({
      type: 'MUTE',
      user: { name: 'Rafael' },
      createdBy: { name: 'Moderadora' },
    })
    const muted = await http
      .post(base)
      .set(rafael!.headers)
      .send({ content: 'Por quê?' })
      .expect(403)
    expect(muted.body.code).toBe('FORUM_MUTED')
    expect(
      (
        await http
          .get(`/v1/courses/${COURSE}/forum/my-restriction`)
          .set(rafael!.headers)
          .expect(200)
      ).body,
    ).toMatchObject({ type: 'MUTE' })
    await http.get(base).set(rafael!.headers).expect(200)

    const restrictions = await http
      .get('/v1/moderation/restrictions')
      .set(moderator)
      .expect(200)
    expect(restrictions.body).toHaveLength(1)
    await http
      .post(`/v1/moderation/restrictions/${mute.body.id}/lift`)
      .set(moderator)
      .send({ reason: 'Conversamos' })
      .expect(204)
    await http
      .post(base)
      .set(rafael!.headers)
      .send({ content: 'Desculpa, pessoal' })
      .expect(201)

    // Autor avisado da remoção e das duas mudanças na restrição
    await new Promise((resolve) => setTimeout(resolve, 300))
    const types = (await database.db.select().from(notifications))
      .filter((row) => row.userId === rafael!.id)
      .map((row) => row.type)
      .sort()
    expect(types).toEqual([
      'FORUM_REPLY',
      'MESSAGE_MODERATED',
      'MESSAGE_MODERATED',
      'USER_RESTRICTED',
      'USER_RESTRICTED',
    ])
  })

  it('descartar denúncias e banir tira o acesso', async () => {
    const [, bruno, carla, diego] = students
    const sale = (
      await http
        .post(base)
        .set(carla!.headers)
        .send({ content: 'Vendo calculadora HP 50g' })
        .expect(201)
    ).body as MessageView
    await http
      .post(`/v1/forum/messages/${sale.id}/reports`)
      .set(bruno!.headers)
      .send({ reason: 'OFF_TOPIC', details: 'Não é do curso' })
      .expect(204)
    await http
      .post(`/v1/forum/messages/${sale.id}/reports/dismiss`)
      .set(moderator)
      .send({ reason: 'Pode vender' })
      .expect(204)
    const none = await http
      .post(`/v1/forum/messages/${sale.id}/reports/dismiss`)
      .set(moderator)
      .send({ reason: 'De novo' })
      .expect(409)
    expect(none.body.code).toBe('FORUM_NO_OPEN_REPORTS')

    await http
      .post('/v1/moderation/restrictions')
      .set(admin)
      .send({
        userId: diego!.id,
        courseSlug: COURSE,
        type: 'BAN',
        reason: 'Assédio',
        days: null,
      })
      .expect(201)
    const banned = await http.get(base).set(diego!.headers).expect(403)
    expect(banned.body.code).toBe('FORUM_BANNED')
  })
})
