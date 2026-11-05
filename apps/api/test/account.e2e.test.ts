import { randomUUID } from 'node:crypto'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { INestApplication } from '@nestjs/common'
import type { EvaluationCriterion, MessageView } from '@ufc-flow/contracts'
import { eq } from 'drizzle-orm'
import sharp from 'sharp'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { parseEnv } from '../src/config/env'
import { createApp } from '../src/create-app'
import {
  academicTerms,
  auditLogs,
  curricula,
  curriculumSubjects,
  files,
  messageReports,
  notifications,
  subjectEvaluations,
  subjects,
  userConsents,
  users as usersTable,
} from '../src/database/schema'
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
let uploads: string
let admin: Record<string, string>
const people: Record<
  'ana' | 'bruno',
  { id: string; headers: Record<string, string>; enrollment: string }
> = {} as never
let criteria: EvaluationCriterion[] = []

const COURSE = 'engenharia-de-computacao'
const CODE = 'ECO0005'
const PASSWORD = 'uma senha longa'
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })
const ADMIN = { email: 'admin@ufc.br', password: 'senha do admin longa' }

const photo = () =>
  sharp({
    create: { width: 400, height: 400, channels: 3, background: '#f97316' },
  })
    .jpeg()
    .toBuffer()

async function until(check: () => Promise<boolean>) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error('a condição não aconteceu a tempo')
}

beforeAll(async () => {
  database = await startDatabase()
  uploads = await mkdtemp(join(tmpdir(), 'ufc-account-'))
  app = await createApp(
    parseEnv({
      NODE_ENV: 'test',
      DATABASE_URL: database.url,
      JWT_SECRET: 'segredo-dos-testes-e2e-com-32-caracteres',
      SIGAA_SYNC_ENABLED: 'false',
      CLASSES_SYNC_ENABLED: 'false',
      UPLOADS_DIR: uploads,
    }),
    { logger: false },
  )
  await app.init()
  http = request(app.getHttpServer())

  const course = await insertCourse(database.db, {
    sigaaId: '657484',
    slug: COURSE,
  })
  const curriculumId = randomUUID()
  await database.db.insert(curricula).values({
    id: curriculumId,
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
  const subjectId = randomUUID()
  await database.db.insert(subjects).values({
    id: subjectId,
    code: CODE,
    name: 'INTRODUÇÃO A ENGENHARIA',
    slug: 'eco0005',
    searchName: 'introducao a engenharia',
    type: 'DISCIPLINE',
    workloadHours: 64,
    theoryHours: 64,
    labHours: 0,
    eadHours: 0,
    extensionHours: 0,
    credits: 4,
  })
  await database.db.insert(curriculumSubjects).values({
    id: randomUUID(),
    curriculumId,
    subjectId,
    semester: 1,
    nature: 'MANDATORY',
  })
  await database.db.insert(academicTerms).values({
    id: randomUUID(),
    code: '2026.2',
    year: 2026,
    period: 2,
    startsAt: '2026-08-10',
    endsAt: '2026-12-11',
    isCurrent: true,
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
  criteria = (
    await http.get('/v1/admin/evaluation-criteria').set(admin).expect(200)
  ).body

  for (const [index, key] of (['ana', 'bruno'] as const).entries()) {
    const signed = await http
      .post('/v1/auth/sign-up')
      .send({
        name: key === 'ana' ? 'Ana Souza' : 'Bruno Lima',
        email: `${key}@alu.ufc.br`,
        password: PASSWORD,
        acceptTerms: true,
        acceptPrivacy: true,
      })
      .expect(201)
    const headers = bearer(signed.body.tokens.accessToken as string)
    const enrollment = await http
      .post('/v1/me/enrollments')
      .set(headers)
      .send({
        courseSlug: COURSE,
        curriculumSlug: '2006-2',
        registrationNumber: `51234${index}`,
        entryTerm: '2023.1',
      })
      .expect(201)
    await http
      .post(`/v1/me/enrollments/${enrollment.body.id}/records`)
      .set(headers)
      .send({ subjectCode: CODE, term: '2023.1', status: 'APROVADO' })
      .expect(201)
    await http
      .put(`/v1/me/evaluations/${CODE}`)
      .set(headers)
      .send({
        scores: criteria.map((criterion) => ({
          criterionId: criterion.id,
          score: 4,
        })),
      })
      .expect(200)
    people[key] = {
      id: signed.body.user.id,
      headers,
      enrollment: enrollment.body.id,
    }
  }
})

afterAll(async () => {
  await app?.close()
  await database?.stop()
  if (uploads) await rm(uploads, { recursive: true, force: true })
})

describe('novo aceite dos documentos', () => {
  it('quem aceitou a 0.1 vê a pendência e aceita a versão vigente', async () => {
    const { ana } = people
    expect(
      (await http.get('/v1/me').set(ana.headers).expect(200)).body
        .pendingConsents,
    ).toEqual([])
    await database.db
      .update(userConsents)
      .set({ version: '0.1' })
      .where(eq(userConsents.userId, ana.id))
    expect(
      (await http.get('/v1/me').set(ana.headers).expect(200)).body
        .pendingConsents,
    ).toEqual(['TERMS', 'PRIVACY'])

    const outdated = await http
      .post('/v1/me/consents')
      .set(ana.headers)
      .send({ termsVersion: '0.1', privacyVersion: '1.0' })
      .expect(409)
    expect(outdated.body.code).toBe('CONSENT_VERSION_OUTDATED')

    const accepted = await http
      .post('/v1/me/consents')
      .set(ana.headers)
      .send({ termsVersion: '1.0', privacyVersion: '1.0' })
      .expect(200)
    expect(accepted.body.pendingConsents).toEqual([])
    // O login também traz a pendência (já resolvida)
    const signedIn = await http
      .post('/v1/auth/sign-in')
      .send({ email: 'ana@alu.ufc.br', password: PASSWORD })
      .expect(200)
    expect(signedIn.body.user.pendingConsents).toEqual([])
  })
})

describe('exportação e exclusão de conta', () => {
  let root: MessageView
  let reply: MessageView
  let avatarId: string

  it('monta o cenário: foto, mensagem, resposta, curtida e denúncia', async () => {
    const { ana, bruno } = people
    const file = await http
      .post('/v1/files')
      .set(ana.headers)
      .field('purpose', 'AVATAR')
      .attach('file', await photo(), { filename: 'eu.jpg' })
      .expect(201)
    avatarId = file.body.id
    await http
      .put('/v1/me/avatar')
      .set(ana.headers)
      .send({ fileId: avatarId })
      .expect(200)

    root = (
      await http
        .post(`/v1/courses/${COURSE}/forum/messages`)
        .set(ana.headers)
        .send({ content: 'Alguém tem o resumo de @ECO0005?' })
        .expect(201)
    ).body
    reply = (
      await http
        .post(`/v1/forum/messages/${root.id}/replies`)
        .set(bruno.headers)
        .send({ content: 'Tenho, te mando.' })
        .expect(201)
    ).body
    await http
      .put(`/v1/forum/messages/${reply.id}/like`)
      .set(ana.headers)
      .expect(200)
    await http
      .post(`/v1/forum/messages/${reply.id}/reports`)
      .set(ana.headers)
      .send({ reason: 'OTHER', details: 'Texto escrito pela Ana' })
      .expect(204)
    await http
      .post(`/v1/forum/messages/${root.id}/reports`)
      .set(bruno.headers)
      .send({ reason: 'SPAM' })
      .expect(204)
  })

  it('a exportação traz tudo o que é da pessoa, sem segredos', async () => {
    const { ana } = people
    await http.get('/v1/me/export').expect(401)
    const response = await http
      .get('/v1/me/export')
      .set(ana.headers)
      .expect(200)
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="ufc-flow-dados.json"',
    )
    const data = response.body
    expect(data).toMatchObject({
      format: 'ufc-flow-export/v1',
      account: {
        name: 'Ana Souza',
        email: 'ana@alu.ufc.br',
        avatarFileId: avatarId,
      },
    })
    expect(data.consents).toHaveLength(4)
    expect(data.enrollments).toEqual([
      expect.objectContaining({ registrationNumber: '512340' }),
    ])
    expect(data.subjectRecords).toEqual([
      expect.objectContaining({ subjectCode: CODE, status: 'APROVADO' }),
    ])
    expect(data.evaluations).toEqual([
      expect.objectContaining({
        subjectCode: CODE,
        scores: expect.objectContaining({ formacao: 4 }),
      }),
    ])
    expect(data.forumMessages).toEqual([
      expect.objectContaining({ content: 'Alguém tem o resumo de @ECO0005?' }),
    ])
    expect(data.forumLikes).toHaveLength(1)
    expect(data.forumReports).toEqual([
      expect.objectContaining({ details: 'Texto escrito pela Ana' }),
    ])
    expect(data.files).toEqual([
      expect.objectContaining({ id: avatarId, purpose: 'AVATAR' }),
    ])
    expect(data.sessions.length).toBeGreaterThan(0)
    const text = JSON.stringify(data)
    expect(text).not.toContain('passwordHash')
    expect(text).not.toContain('refreshTokenHash')
    expect(text).not.toContain('$argon2')
  })

  it('o último admin não pode excluir a conta', async () => {
    const response = await http
      .delete('/v1/me')
      .set(admin)
      .send({ password: ADMIN.password })
      .expect(409)
    expect(response.body.code).toBe('LAST_ADMIN')
  })

  it('senha errada não exclui', async () => {
    const response = await http
      .delete('/v1/me')
      .set(people.ana.headers)
      .send({ password: 'outra senha qualquer' })
      .expect(400)
    expect(response.body.code).toBe('PASSWORD_MISMATCH')
  })

  it('excluir apaga os dados pessoais e anonimiza o que é da comunidade', async () => {
    const { ana, bruno } = people
    await http
      .delete('/v1/me')
      .set(ana.headers)
      .send({ password: PASSWORD })
      .expect(204)

    // Não entra mais
    await http
      .post('/v1/auth/sign-in')
      .send({ email: 'ana@alu.ufc.br', password: PASSWORD })
      .expect(401)
    expect(
      await database.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, ana.id)),
    ).toEqual([])

    // A mensagem vira "removida", sem texto e sem autor; a resposta fica
    const thread = await http
      .get(`/v1/forum/messages/${root.id}`)
      .set(bruno.headers)
      .expect(200)
    const anonymized = thread.body.message ?? thread.body
    expect(anonymized).toMatchObject({
      author: null,
      content: null,
      status: 'REMOVED',
      removedBy: 'ACCOUNT_DELETED',
      removalCategory: null,
    })
    const replyNow = await http
      .get(`/v1/forum/messages/${reply.id}`)
      .set(bruno.headers)
      .expect(200)
    const replyView = replyNow.body.message ?? replyNow.body
    expect(replyView).toMatchObject({
      content: 'Tenho, te mando.',
      likeCount: 0,
    })

    // Denúncias: o texto da Ana sai da cópia e da observação
    const reports = await database.db.select().from(messageReports)
    expect(
      reports.find((report) => report.messageId === root.id)?.contentSnapshot,
    ).toBe('')
    expect(
      reports.find((report) => report.messageId === reply.id),
    ).toMatchObject({ reporterId: null, details: null })

    // Avaliação continua na média, sem dono
    const evaluations = await database.db.select().from(subjectEvaluations)
    expect(evaluations).toHaveLength(2)
    expect(evaluations.filter((row) => row.userId === null)).toHaveLength(1)

    // Avisos do Bruno sobre o que a Ana fez saem
    expect(
      await database.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, bruno.id)),
    ).toEqual([])

    // Auditoria sem dados pessoais
    const [audit] = await database.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'account.deleted'))
    expect(audit).toMatchObject({
      actorId: null,
      entityId: ana.id,
      changes: null,
    })

    // A foto sai do banco e do disco logo depois (evento AccountDeleted)
    await until(
      async () =>
        (await database.db.select().from(files).where(eq(files.id, avatarId)))
          .length === 0,
    )
    const left = await readdir(uploads, {
      recursive: true,
      withFileTypes: true,
    })
    expect(left.filter((entry) => entry.isFile())).toEqual([])
  })
})

describe('admin › usuários', () => {
  it('busca por nome ou e-mail, com o número de avaliações', async () => {
    await http.get('/v1/admin/users').set(people.bruno.headers).expect(403)
    const page = await http
      .get('/v1/admin/users')
      .query({ q: 'bruno' })
      .set(admin)
      .expect(200)
    expect(page.body).toEqual({
      items: [
        expect.objectContaining({
          name: 'Bruno Lima',
          status: 'ACTIVE',
          roles: [],
          evaluationCount: 1,
        }),
      ],
      nextCursor: null,
    })
    const all = await http.get('/v1/admin/users').set(admin).expect(200)
    expect(all.body.items.map((user: { name: string }) => user.name)).toEqual([
      'Bruno Lima',
      'Admin',
    ])
    // % não vira curinga
    expect(
      (
        await http
          .get('/v1/admin/users')
          .query({ q: '%' })
          .set(admin)
          .expect(200)
      ).body.items,
    ).toEqual([])
  })

  it('suspender bloqueia o login; reativar devolve', async () => {
    const { bruno } = people
    const self = await http.get('/v1/me').set(admin).expect(200)
    const own = await http
      .post(`/v1/admin/users/${self.body.id}/suspend`)
      .set(admin)
      .expect(409)
    expect(own.body.code).toBe('CANNOT_SUSPEND_SELF')

    await http
      .post(`/v1/admin/users/${bruno.id}/suspend`)
      .set(bruno.headers)
      .expect(403)
    await http
      .post(`/v1/admin/users/${bruno.id}/suspend`)
      .set(admin)
      .expect(204)
    const blocked = await http
      .post('/v1/auth/sign-in')
      .send({ email: 'bruno@alu.ufc.br', password: PASSWORD })
      .expect(403)
    expect(blocked.body.code).toBe('USER_SUSPENDED')
    expect(
      (
        await http
          .get('/v1/admin/users')
          .query({ status: 'SUSPENDED' })
          .set(admin)
          .expect(200)
      ).body.items,
    ).toHaveLength(1)

    await http
      .post(`/v1/admin/users/${bruno.id}/reactivate`)
      .set(admin)
      .expect(204)
    await http
      .post('/v1/auth/sign-in')
      .send({ email: 'bruno@alu.ufc.br', password: PASSWORD })
      .expect(200)
    await http
      .post(`/v1/admin/users/${randomUUID()}/suspend`)
      .set(admin)
      .expect(404)
  })

  it('descartar as avaliações de uma conta', async () => {
    const { bruno } = people
    await http
      .delete(`/v1/admin/users/${bruno.id}/evaluations`)
      .set(bruno.headers)
      .expect(403)
    const response = await http
      .delete(`/v1/admin/users/${bruno.id}/evaluations`)
      .set(admin)
      .expect(200)
    expect(response.body).toEqual({ discarded: 1 })
    expect(
      (
        await http
          .get('/v1/admin/users')
          .query({ q: 'bruno' })
          .set(admin)
          .expect(200)
      ).body.items[0].evaluationCount,
    ).toBe(0)
    await http
      .delete(`/v1/admin/users/${randomUUID()}/evaluations`)
      .set(admin)
      .expect(404)
  })
})
