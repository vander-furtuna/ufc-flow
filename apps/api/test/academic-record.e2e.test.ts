import { randomUUID } from 'node:crypto'

import type { INestApplication } from '@nestjs/common'
import type { AcademicSummary } from '@ufc-flow/contracts'
import { eq } from 'drizzle-orm'
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
  subjectEquivalences,
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
let ana: Record<string, string>
let bia: Record<string, string>
let admin: Record<string, string>
let anaId: string
const ec = { old: randomUUID(), next: randomUUID(), cc: randomUUID() }

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
  return {
    headers: bearer(response.body.tokens.accessToken as string),
    id: response.body.user.id as string,
  }
}

async function insertCurriculum(id: string, courseId: string, slug: string) {
  await database.db.insert(curricula).values({
    id,
    courseId,
    code: slug.replace('-', '.'),
    effectiveTerm: slug.replace('-', '.'),
    slug,
    matrixName: 'Matriz',
    status: 'PUBLISHED',
    minTotalHours: 356,
    mandatoryHours: 292,
    optativeHours: 64,
    extensionHours: 0,
    specificActivityHours: 100,
    maxFreeOptativeHours: 32,
    minPeriods: 10,
    avgPeriods: 10,
    maxPeriods: 15,
    periodMinHours: 0,
    periodAvgHours: 360,
    periodMaxHours: 0,
  })
}

const subjectIds = new Map<string, string>()

async function insertSubject(
  code: string,
  name: string,
  type: 'DISCIPLINE' | 'COMPLEMENTARY_ACTIVITY' = 'DISCIPLINE',
  workloadHours = 64,
) {
  const id = randomUUID()
  subjectIds.set(code, id)
  await database.db.insert(subjects).values({
    id,
    code,
    name,
    slug: code.toLowerCase(),
    searchName: name.toLowerCase(),
    type,
    workloadHours,
    theoryHours: workloadHours,
    labHours: 0,
    eadHours: 0,
    extensionHours: 0,
    credits: 4,
  })
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

  const eng = await insertCourse(database.db, {
    sigaaId: '657484',
    slug: 'engenharia-de-computacao',
  })
  const cc = await insertCourse(database.db, {
    sigaaId: '657485',
    slug: 'ciencia-da-computacao',
  })
  await insertCurriculum(ec.old, eng.id, '2006-2')
  await insertCurriculum(ec.next, eng.id, '2025-1')
  await insertCurriculum(ec.cc, cc.id, '2020-1')
  await insertSubject('ECO0001', 'CÁLCULO')
  await insertSubject('ECO0002', 'FÍSICA')
  await insertSubject('LIV0001', 'LIBRAS', 'DISCIPLINE', 32)
  await insertSubject('ATV0001', 'ATIVIDADES', 'COMPLEMENTARY_ACTIVITY', 100)
  await insertSubject('MAT0001', 'CÁLCULO DIFERENCIAL')
  for (const [code, semester, prerequisite] of [
    ['ECO0001', 1, null],
    ['ECO0002', 2, { kind: 'subject', code: 'ECO0001' }],
    ['ATV0001', null, null],
  ] as const) {
    await database.db.insert(curriculumSubjects).values({
      id: randomUUID(),
      curriculumId: ec.old,
      subjectId: subjectIds.get(code)!,
      semester,
      nature: 'MANDATORY',
      prerequisiteExpr: prerequisite,
    })
  }
  // CÁLCULO DIFERENCIAL cumpre CÁLCULO
  await database.db.insert(subjectEquivalences).values({
    subjectId: subjectIds.get('ECO0001')!,
    expr: { kind: 'subject', code: 'MAT0001' },
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
  admin = bearer(
    (await http.post('/v1/auth/sign-in').send(ADMIN).expect(200)).body.tokens
      .accessToken,
  )
  const anaUser = await signUp('ana@ufc.br')
  ana = anaUser.headers
  anaId = anaUser.id
  bia = (await signUp('bia@ufc.br')).headers
})

afterAll(async () => {
  await app?.close()
  await database?.stop()
})

describe('vida acadêmica de ponta a ponta', () => {
  let enrollmentId: string
  let categoryId: string

  it('exige login', async () => {
    await http.get('/v1/me/enrollments').expect(401)
    await http.get(`/v1/me/enrollments/${randomUUID()}/summary`).expect(401)
  })

  it('cria a matrícula e trava a EC no editor', async () => {
    const enrollment = {
      courseSlug: 'engenharia-de-computacao',
      curriculumSlug: '2006-2',
      registrationNumber: '512345',
      entryTerm: '2023.1',
    }
    await http
      .post('/v1/me/enrollments')
      .set(ana)
      .send({ ...enrollment, registrationNumber: '51-23' })
      .expect(400)
    const created = await http
      .post('/v1/me/enrollments')
      .set(ana)
      .send(enrollment)
      .expect(201)
    enrollmentId = created.body.id
    expect(created.body).toMatchObject({
      course: { slug: 'engenharia-de-computacao' },
      curriculum: { slug: '2006-2' },
      status: 'ACTIVE',
      isCurrent: true,
    })
    const again = await http
      .post('/v1/me/enrollments')
      .set(ana)
      .send(enrollment)
      .expect(409)
    expect(again.body.code).toBe('ENROLLMENT_ALREADY_EXISTS')

    const managed = await http
      .get(`/v1/manage/curricula/${ec.old}`)
      .set(admin)
      .expect(200)
    expect(managed.body.locked).toBe(true)
  })

  it('categorias por EC só para moderador ou admin', async () => {
    const input = { kind: 'COMPLEMENTARY', name: 'Monitoria', maxHours: 60 }
    await http
      .post(`/v1/manage/curricula/${ec.old}/activity-categories`)
      .set(ana)
      .send(input)
      .expect(403)
    const created = await http
      .post(`/v1/manage/curricula/${ec.old}/activity-categories`)
      .set(admin)
      .send(input)
      .expect(201)
    categoryId = created.body.id
    expect(created.body).toMatchObject({ ...input, position: 0 })
    const listed = await http
      .get(`/v1/manage/curricula/${ec.old}/activity-categories`)
      .set(admin)
      .expect(200)
    expect(listed.body).toHaveLength(1)
  })

  it('lança o histórico com as regras do academic-core', async () => {
    const records = `/v1/me/enrollments/${enrollmentId}/records`
    const equivalent = await http
      .post(records)
      .set(ana)
      .send({
        subjectCode: 'MAT0001',
        term: '2024.1',
        status: 'APROVADO',
        grade: 8.25,
      })
      .expect(201)
    expect(equivalent.body).toMatchObject({
      subjectName: 'CÁLCULO DIFERENCIAL',
      nature: 'FREE',
      grade: 8.25,
    })
    const open = await http
      .post(records)
      .set(ana)
      .send({ subjectCode: 'ECO0002', term: '2026.2', status: 'CURSANDO' })
      .expect(201)

    for (const [body, status, code] of [
      [
        { subjectCode: 'ECO0002', term: '2026.2', status: 'APROVADO' },
        409,
        'RECORD_OPEN_ATTEMPT_EXISTS',
      ],
      [
        { subjectCode: 'LIV0001', term: '2027.1', status: 'APROVADO' },
        400,
        'RECORD_TERM_IN_FUTURE',
      ],
      [
        { subjectCode: 'LIV0001', term: '2025.1', status: 'CURSANDO' },
        400,
        'RECORD_IN_PROGRESS_OUTSIDE_CURRENT_TERM',
      ],
      [
        { subjectCode: 'XYZ0001', term: '2025.1', status: 'APROVADO' },
        404,
        'SUBJECT_NOT_FOUND',
      ],
    ] as const) {
      const response = await http
        .post(records)
        .set(ana)
        .send(body)
        .expect(status)
      expect(response.body.code).toBe(code)
    }

    await http.get(records).set(bia).expect(404)
    await http
      .patch(`/v1/me/records/${open.body.id}`)
      .set(bia)
      .send({ status: 'APROVADO' })
      .expect(404)
    const listed = await http.get(records).set(ana).expect(200)
    expect(
      listed.body.map((item: { subjectCode: string }) => item.subjectCode),
    ).toEqual(['MAT0001', 'ECO0002'])
  })

  it('lança atividade com certificado privado', async () => {
    const fileId = randomUUID()
    await database.db.insert(files).values({
      id: fileId,
      ownerId: anaId,
      purpose: 'CERTIFICATE',
      visibility: 'PRIVATE',
      storageKey: `certificate/${fileId}.pdf`,
      originalName: 'certificado.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      sha256: 'x'.repeat(64),
      status: 'PENDING',
      createdAt: new Date(),
    })
    const created = await http
      .post(`/v1/me/enrollments/${enrollmentId}/activities`)
      .set(ana)
      .send({
        kind: 'COMPLEMENTARY',
        categoryId,
        title: 'Monitoria de Cálculo',
        hours: 80,
        startedOn: '2025-03-01',
        endedOn: '2025-07-01',
        certificateFileId: fileId,
      })
      .expect(201)
    expect(created.body).toMatchObject({ hours: 80, certificateFileId: fileId })
    const [file] = await database.db
      .select({ status: files.status })
      .from(files)
      .where(eq(files.id, fileId))
    expect(file?.status).toBe('ATTACHED')
  })

  it('resume o progresso (D40), o que está em curso e as liberadas', async () => {
    const response = await http
      .get(`/v1/me/enrollments/${enrollmentId}/summary`)
      .set(ana)
      .expect(200)
    const summary = response.body as AcademicSummary
    expect(summary.currentTerm).toEqual({
      code: '2026.2',
      endsAt: '2026-12-11',
    })
    // 292 - 100 do componente; CÁLCULO cumprida pela equivalente
    expect(summary.progress.mandatory).toEqual({
      requiredHours: 192,
      completedHours: 64,
      met: false,
    })
    expect(summary.progress.optative.freeHours).toBe(0)
    expect(summary.progress.complementary).toMatchObject({
      requiredHours: 100,
      completedHours: 60,
      byCategory: [{ categoryId, declaredHours: 80, countedHours: 60 }],
    })
    expect(summary.inProgress.map((item) => item.subjectCode)).toEqual([
      'ECO0002',
    ])
    expect(summary.available).toEqual([])
    expect(summary.categories).toHaveLength(1)
    await http
      .get(`/v1/me/enrollments/${enrollmentId}/summary`)
      .set(bia)
      .expect(404)
  })

  it('fecha a situação e exclui registro', async () => {
    const records = await http
      .get(`/v1/me/enrollments/${enrollmentId}/records`)
      .set(ana)
      .expect(200)
    const open = records.body.find(
      (item: { status: string }) => item.status === 'CURSANDO',
    )
    const closed = await http
      .patch(`/v1/me/records/${open.id}`)
      .set(ana)
      .send({ status: 'TRANCADA', grade: 5 })
      .expect(400)
    expect(closed.body.code).toBe('RECORD_GRADE_NOT_ALLOWED')
    await http
      .patch(`/v1/me/records/${open.id}`)
      .set(ana)
      .send({ status: 'TRANCADA' })
      .expect(200)
    const again = await http
      .patch(`/v1/me/records/${open.id}`)
      .set(ana)
      .send({ status: 'APROVADO' })
      .expect(409)
    expect(again.body.code).toBe('RECORD_INVALID_TRANSITION')
    await http.delete(`/v1/me/records/${open.id}`).set(ana).expect(204)
  })

  it('migra de EC com auditoria e transfere de curso', async () => {
    const migrated = await http
      .patch(`/v1/me/enrollments/${enrollmentId}/curriculum`)
      .set(ana)
      .send({ curriculumSlug: '2025-1' })
      .expect(200)
    expect(migrated.body.curriculum.slug).toBe('2025-1')
    const audit = await database.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, enrollmentId))
    expect(audit).toEqual([
      expect.objectContaining({
        module: 'academic-record',
        action: 'CURRICULUM_CHANGED',
        changes: { from: ec.old, to: ec.next },
      }),
    ])
    // A categoria da EC antiga deixa de valer
    const activities = await http
      .get(`/v1/me/enrollments/${enrollmentId}/activities`)
      .set(ana)
      .expect(200)
    expect(activities.body[0].categoryId).toBeNull()

    const transfer = await http
      .post('/v1/me/enrollments')
      .set(ana)
      .send({
        courseSlug: 'ciencia-da-computacao',
        curriculumSlug: '2020-1',
        registrationNumber: '600001',
      })
      .expect(201)
    const listed = await http.get('/v1/me/enrollments').set(ana).expect(200)
    expect(
      listed.body.map((item: { id: string; status: string }) => [
        item.id,
        item.status,
      ]),
    ).toEqual([
      [transfer.body.id, 'ACTIVE'],
      [enrollmentId, 'TRANSFERRED'],
    ])
    const stuck = await http
      .patch(`/v1/me/enrollments/${enrollmentId}/curriculum`)
      .set(ana)
      .send({ curriculumSlug: '2006-2' })
      .expect(409)
    expect(stuck.body.code).toBe('ENROLLMENT_NOT_ACTIVE')
  })
})
