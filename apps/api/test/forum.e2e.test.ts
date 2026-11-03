import { randomUUID } from 'node:crypto'

import type { INestApplication } from '@nestjs/common'
import type { MessageView } from '@ufc-flow/contracts'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { parseEnv } from '../src/config/env'
import { createApp } from '../src/create-app'
import {
  curricula,
  curriculumSubjects,
  notifications,
  subjects,
} from '../src/database/schema'
import {
  insertCourse,
  startDatabase,
  type TestDatabase,
} from './support/database'

let database: TestDatabase
let app: INestApplication
let http: ReturnType<typeof request>
let ana: Record<string, string>
let bruno: Record<string, string>
let visitor: Record<string, string>

const COURSE = 'engenharia-de-computacao'
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
  return bearer(response.body.tokens.accessToken as string)
}

async function enroll(headers: Record<string, string>, number: string) {
  await http
    .post('/v1/me/enrollments')
    .set(headers)
    .send({
      courseSlug: COURSE,
      curriculumSlug: '2006-2',
      registrationNumber: number,
      entryTerm: '2023.1',
    })
    .expect(201)
}

async function insertSubject(code: string, name: string) {
  const id = randomUUID()
  await database.db.insert(subjects).values({
    id,
    code,
    name,
    slug: code.toLowerCase(),
    searchName: name
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase(),
    type: 'DISCIPLINE',
    workloadHours: 64,
    theoryHours: 64,
    labHours: 0,
    eadHours: 0,
    extensionHours: 0,
    credits: 4,
  })
  return id
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
      // Folga para o teste; o limite tem o próprio caso
      FORUM_RATE_BURST: '3',
      FORUM_RATE_HOURLY: '30',
    }),
    { logger: false },
  )
  await app.init()
  http = request(app.getHttpServer())

  const course = await insertCourse(database.db, {
    sigaaId: '657484',
    slug: COURSE,
  })
  const other = await insertCourse(database.db, {
    sigaaId: '657490',
    slug: 'ciencias-economicas',
    name: 'Ciências Econômicas',
  })
  const curriculum = (courseId: string, slug: string) => ({
    id: randomUUID(),
    courseId,
    code: slug.replace('-', '.'),
    effectiveTerm: slug.replace('-', '.'),
    slug,
    matrixName: 'Matriz',
    status: 'PUBLISHED' as const,
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
  const eng = curriculum(course.id, '2006-2')
  const econ = curriculum(other.id, '2025-1')
  await database.db.insert(curricula).values([eng, econ])
  const calc = await insertSubject(
    'SBL0057',
    'Cálculo Diferencial e Integral I',
  )
  const so = await insertSubject('ECO0036', 'Sistemas Operacionais')
  const calcEcon = await insertSubject('ECN0012', 'Cálculo Aplicado à Economia')
  await insertSubject('XYZ0001', 'Cálculo de rascunho')
  await database.db.insert(curriculumSubjects).values([
    {
      id: randomUUID(),
      curriculumId: eng.id,
      subjectId: calc,
      semester: 1,
      nature: 'MANDATORY',
    },
    {
      id: randomUUID(),
      curriculumId: eng.id,
      subjectId: so,
      semester: 5,
      nature: 'MANDATORY',
    },
    {
      id: randomUUID(),
      curriculumId: econ.id,
      subjectId: calcEcon,
      semester: 2,
      nature: 'MANDATORY',
    },
  ])

  ana = await signUp('ana@ufc.br', 'Ana Souza')
  bruno = await signUp('bruno@ufc.br', 'Bruno Lima')
  visitor = await signUp('visitante@ufc.br', 'Visitante')
  await enroll(ana, '512345')
  await enroll(bruno, '512346')
})

afterAll(async () => {
  await app?.close()
  await database?.stop()
})

describe('fórum de ponta a ponta', () => {
  let root: MessageView

  it('busca de disciplinas para o @: EC vigente primeiro, sem as de rascunho', async () => {
    const response = await http
      .get(`/v1/courses/${COURSE}/subjects/search?q=calc`)
      .expect(200)
    expect(response.body).toEqual([
      expect.objectContaining({
        code: 'SBL0057',
        inCurriculum: true,
        semester: 1,
        nature: 'MANDATORY',
        courseName: null,
      }),
      expect.objectContaining({
        code: 'ECN0012',
        inCurriculum: false,
        courseName: 'Ciências Econômicas',
      }),
    ])
  })

  it('lê quem entrou; escreve quem tem matrícula', async () => {
    await http.get(base).expect(401)
    expect((await http.get(base).set(visitor).expect(200)).body.items).toEqual(
      [],
    )
    const denied = await http
      .post(base)
      .set(visitor)
      .send({ content: 'Oi' })
      .expect(403)
    expect(denied.body.code).toBe('FORUM_POST_FORBIDDEN')
    root = (
      await http
        .post(base)
        .set(ana)
        .send({ content: 'A prova de @ECO0036 cobra escalonamento? @XYZ9999' })
        .expect(201)
    ).body
    expect(root).toMatchObject({
      author: { name: 'Ana Souza' },
      mentions: [{ code: 'ECO0036', name: 'Sistemas Operacionais' }],
      likedByMe: false,
    })
    expect(root.editableUntil).not.toBeNull()
    const tooLong = await http
      .post(base)
      .set(ana)
      .send({ content: 'a'.repeat(501) })
      .expect(400)
    expect(tooLong.body.code).toBe('VALIDATION_FAILED')
  })

  it('conversa, curtidas e notificações', async () => {
    const reply = (
      await http
        .post(`/v1/forum/messages/${root.id}/replies`)
        .set(bruno)
        .send({ content: 'Cobrou Round Robin.' })
        .expect(201)
    ).body as MessageView
    expect(reply).toMatchObject({
      parentId: root.id,
      rootId: root.id,
      replyingTo: { authorName: 'Ana Souza' },
    })
    expect(
      (
        await http
          .put(`/v1/forum/messages/${root.id}/like`)
          .set(bruno)
          .expect(200)
      ).body,
    ).toEqual({ likeCount: 1, likedByMe: true })

    const conversation = await http
      .get(`/v1/forum/messages/${reply.id}`)
      .set(visitor)
      .expect(200)
    expect(conversation.body.ancestors.map((m: MessageView) => m.id)).toEqual([
      root.id,
    ])
    expect(conversation.body.ancestors[0]).toMatchObject({
      replyCount: 1,
      likeCount: 1,
    })
    const replies = await http
      .get(`/v1/forum/messages/${root.id}/replies`)
      .set(ana)
      .expect(200)
    expect(replies.body.items.map((m: MessageView) => m.content)).toEqual([
      'Cobrou Round Robin.',
    ])

    // Notificações depois do commit
    await new Promise((resolve) => setTimeout(resolve, 300))
    const types = (await database.db.select().from(notifications)).map(
      (row) => row.type,
    )
    expect(types.sort()).toEqual(['FORUM_LIKES', 'FORUM_REPLY'])
  })

  it('novas mensagens, discussões da disciplina e mais citadas', async () => {
    await http
      .post(base)
      .set(bruno)
      .send({ content: 'Também quero saber de @ECO0036' })
      .expect(201)
    const count = await http
      .get(`${base}/new-count?since=${encodeURIComponent(root.createdAt)}`)
      .set(ana)
      .expect(200)
    expect(count.body).toEqual({ count: 1 })
    const discussions = await http
      .get(`/v1/courses/${COURSE}/forum/subjects/ECO0036/messages`)
      .set(ana)
      .expect(200)
    expect(discussions.body.items).toHaveLength(2)
    const trending = await http
      .get(`/v1/courses/${COURSE}/forum/trending-subjects`)
      .set(ana)
      .expect(200)
    expect(trending.body).toEqual([
      {
        code: 'ECO0036',
        name: 'Sistemas Operacionais',
        slug: 'eco0036',
        count: 2,
      },
    ])
  })

  it('edita, apaga e respeita o limite de envio', async () => {
    const edited = await http
      .put(`/v1/forum/messages/${root.id}`)
      .set(ana)
      .send({ content: 'Editada sobre @SBL0057' })
      .expect(200)
    expect(edited.body.mentions.map((m: { code: string }) => m.code)).toEqual([
      'SBL0057',
    ])
    expect(edited.body.editedAt).not.toBeNull()
    const notAuthor = await http
      .put(`/v1/forum/messages/${root.id}`)
      .set(bruno)
      .send({ content: 'x' })
      .expect(403)
    expect(notAuthor.body.code).toBe('FORUM_NOT_AUTHOR')

    // Com resposta, fica "mensagem apagada"
    await http.delete(`/v1/forum/messages/${root.id}`).set(ana).expect(204)
    const timeline = await http.get(base).set(bruno).expect(200)
    expect(
      timeline.body.items.find((m: MessageView) => m.id === root.id),
    ).toMatchObject({ content: null, status: 'REMOVED', removedBy: 'AUTHOR' })

    // O limite do teste é 3 a cada 10 s: o quarto envio seguido é recusado
    for (const content of ['Um', 'Dois', 'Três']) {
      await http.post(base).set(bruno).send({ content })
    }
    const limited = await http
      .post(base)
      .set(bruno)
      .send({ content: 'Quatro' })
      .expect(429)
    expect(limited.body.code).toBe('FORUM_RATE_LIMITED')
  })
})
