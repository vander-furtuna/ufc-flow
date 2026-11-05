import { randomUUID } from 'node:crypto'

import type { INestApplication } from '@nestjs/common'
import type { EvaluationCriterion } from '@ufc-flow/contracts'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { parseEnv } from '../src/config/env'
import { createApp } from '../src/create-app'
import {
  academicTerms,
  curricula,
  curriculumSubjects,
  subjectEvaluations,
  subjects,
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
let admin: Record<string, string>
const students: { headers: Record<string, string>; enrollment: string }[] = []
let criteria: EvaluationCriterion[] = []

const COURSE = 'engenharia-de-computacao'
const CODE = 'ECO0005'
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })
const ADMIN = { email: 'admin@ufc.br', password: 'senha do admin longa' }

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

  // Registrar no histórico exige o semestre vigente
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

  for (let index = 0; index < 6; index++) {
    const signed = await http
      .post('/v1/auth/sign-up')
      .send({
        name: `Aluna ${index}`,
        email: `aluna${index}@ufc.br`,
        password: 'uma senha longa',
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
    students.push({ headers, enrollment: enrollment.body.id })
  }
})

afterAll(async () => {
  await app?.close()
  await database?.stop()
})

const scores = (values: number[]) => ({
  scores: criteria.map((criterion, index) => ({
    criterionId: criterion.id,
    score: values[index] ?? 3,
  })),
})

describe('avaliação de disciplinas de ponta a ponta', () => {
  it('nasce com os 5 critérios sugeridos; só admin gerencia', async () => {
    await http.get('/v1/admin/evaluation-criteria').expect(401)
    await http
      .get('/v1/admin/evaluation-criteria')
      .set(students[0]!.headers)
      .expect(403)
    criteria = (
      await http.get('/v1/admin/evaluation-criteria').set(admin).expect(200)
    ).body
    expect(criteria.map((item) => item.key)).toEqual([
      'formacao',
      'pratica',
      'carga',
      'dificuldade',
      'organizacao',
    ])
    const summary = await http
      .get(`/v1/subjects/${CODE}/evaluations`)
      .expect(200)
    expect(summary.body).toMatchObject({ enough: false, total: null })
    expect(summary.body.criteria[2]).toMatchObject({
      label: 'Carga de trabalho',
      lowLabel: 'leve',
      highLabel: 'pesada',
      mean: null,
    })
  })

  it('só avalia quem foi aprovado ou reprovado; editar não duplica', async () => {
    const [ana] = students
    const mine = `/v1/me/evaluations/${CODE}`
    expect(
      (await http.get(mine).set(ana!.headers).expect(200)).body.eligibility,
    ).toMatchObject({ eligible: false, requiresInstitutionalEmail: false })
    const denied = await http
      .put(mine)
      .set(ana!.headers)
      .send(scores([5, 5, 5, 5, 5]))
      .expect(403)
    expect(denied.body.code).toBe('EVALUATION_NOT_ELIGIBLE')

    for (const [index, student] of students.entries()) {
      await http
        .post(`/v1/me/enrollments/${student.enrollment}/records`)
        .set(student.headers)
        .send({
          subjectCode: CODE,
          term: '2023.1',
          status: index === 5 ? 'REPROVADO' : 'APROVADO',
        })
        .expect(201)
    }
    const incomplete = await http
      .put(mine)
      .set(ana!.headers)
      .send({ scores: [{ criterionId: criteria[0]!.id, score: 5 }] })
      .expect(400)
    expect(incomplete.body.code).toBe('EVALUATION_INCOMPLETE')
    await http
      .put(mine)
      .set(ana!.headers)
      .send(scores([1, 1, 1, 1, 1]))
      .expect(200)
    const saved = await http
      .put(mine)
      .set(ana!.headers)
      .send(scores([5, 4, 3, 2, 4]))
      .expect(200)
    expect(saved.body).toMatchObject({
      eligibility: { eligible: true, status: 'APROVADO', term: '2023.1' },
    })
    expect(saved.body.scores).toHaveLength(5)
    expect(await database.db.select().from(subjectEvaluations)).toHaveLength(1)
  })

  it('médias a partir de 5 avaliações, sem quem avaliou', async () => {
    for (const student of students.slice(1, 4)) {
      await http
        .put(`/v1/me/evaluations/${CODE}`)
        .set(student.headers)
        .send(scores([4, 4, 3, 2, 4]))
        .expect(200)
    }
    expect(
      (await http.get(`/v1/subjects/${CODE}/evaluations`).expect(200)).body
        .enough,
    ).toBe(false)
    await http
      .put(`/v1/me/evaluations/${CODE}`)
      .set(students[5]!.headers)
      .send(scores([3, 4, 5, 5, 3]))
      .expect(200)
    const summary = await http
      .get(`/v1/subjects/${CODE}/evaluations`)
      .expect(200)
    expect(summary.body).toMatchObject({ enough: true, total: 5 })
    expect(summary.body.criteria[0]).toMatchObject({
      key: 'formacao',
      mean: 4,
      count: 5,
      distribution: [0, 0, 1, 3, 1],
    })
    expect(JSON.stringify(summary.body)).not.toMatch(/userId|user_id|aluna/)
  })

  it('admin cria, desativa e ordena critérios', async () => {
    const created = await http
      .post('/v1/admin/evaluation-criteria')
      .set(admin)
      .send({
        key: 'avaliacoes',
        label: 'Justiça das avaliações',
        lowLabel: 'injustas',
        highLabel: 'justas',
      })
      .expect(201)
    expect(created.body.position).toBe(5)
    const taken = await http
      .post('/v1/admin/evaluation-criteria')
      .set(admin)
      .send({ key: 'carga', label: 'x', lowLabel: 'a', highLabel: 'b' })
      .expect(409)
    expect(taken.body.code).toBe('EVALUATION_CRITERION_KEY_TAKEN')
    await http
      .put(`/v1/admin/evaluation-criteria/${created.body.id}`)
      .set(admin)
      .send({ ...created.body, isActive: false })
      .expect(200)
    const order = await http
      .put('/v1/admin/evaluation-criteria/order')
      .set(admin)
      .send({ ids: [created.body.id, ...criteria.map((item) => item.id)] })
      .expect(200)
    expect(order.body[0].key).toBe('avaliacoes')
    const summary = await http
      .get(`/v1/subjects/${CODE}/evaluations`)
      .expect(200)
    expect(summary.body.criteria).toHaveLength(5)
  })
})
