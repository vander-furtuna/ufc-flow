import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { INestApplication } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import sharp from 'sharp'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { parseEnv } from '../src/config/env'
import { createApp } from '../src/create-app'
import { files } from '../src/database/schema'
import { CleanupFilesUseCase } from '../src/modules/files/application/files.use-cases'
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
let ana: Record<string, string>
let bia: Record<string, string>
let courseId: string

const ADMIN = { email: 'admin@ufc.br', password: 'senha do admin longa' }
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })
const PDF = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF')

// Foto grande e com EXIF (inclusive GPS), como sai de um celular
const photo = () =>
  sharp({
    create: { width: 3000, height: 1500, channels: 3, background: '#f97316' },
  })
    .jpeg()
    .withExif({
      IFD0: { Copyright: 'Ana Souza', Make: 'Celular' },
      IFD3: { GPSLatitudeRef: 'S', GPSLongitudeRef: 'W' },
    })
    .toBuffer()

async function signUp(email: string) {
  return bearer(
    (
      await http
        .post('/v1/auth/sign-up')
        .send({
          name: 'Ana Souza',
          email,
          password: 'uma senha longa',
          acceptTerms: true,
          acceptPrivacy: true,
        })
        .expect(201)
    ).body.tokens.accessToken,
  )
}

const binary = (response: request.Response) => response.body as Buffer
const asBuffer = (req: request.Test) =>
  req.buffer(true).parse((res, done) => {
    const chunks: Buffer[] = []
    res.on('data', (chunk: Buffer) => chunks.push(chunk))
    res.on('end', () => done(null, Buffer.concat(chunks)))
  })

beforeAll(async () => {
  database = await startDatabase()
  uploads = await mkdtemp(join(tmpdir(), 'ufc-uploads-'))
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
  admin = bearer(
    (await http.post('/v1/auth/sign-in').send(ADMIN).expect(200)).body.tokens
      .accessToken,
  )
  ana = await signUp('ana@ufc.br')
  bia = await signUp('bia@ufc.br')
})

afterAll(async () => {
  await app?.close()
  await database?.stop()
  if (uploads) await rm(uploads, { recursive: true, force: true })
})

describe('arquivos de ponta a ponta', () => {
  let avatarId: string

  it('foto vira WebP de até 2000 px, sem EXIF, com cache longo', async () => {
    await http.post('/v1/files').field('purpose', 'AVATAR').expect(401)
    const created = await http
      .post('/v1/files')
      .set(ana)
      .field('purpose', 'AVATAR')
      .attach('file', await photo(), { filename: 'Minha foto.jpg' })
      .expect(201)
    expect(created.body).toMatchObject({
      purpose: 'AVATAR',
      visibility: 'PUBLIC',
      status: 'PENDING',
      originalName: 'Minha foto.jpg',
      mimeType: 'image/webp',
      width: 2000,
      height: 1000,
    })
    avatarId = created.body.id

    // Público: qualquer um lê, sem token
    const served = await asBuffer(http.get(`/v1/files/${avatarId}`)).expect(200)
    expect(served.headers['content-type']).toBe('image/webp')
    expect(served.headers['cache-control']).toContain('immutable')
    expect(served.headers['x-content-type-options']).toBe('nosniff')
    const metadata = await sharp(binary(served)).metadata()
    expect(metadata).toMatchObject({ format: 'webp', width: 2000 })
    expect(metadata.exif).toBeUndefined()

    const [row] = await database.db
      .select()
      .from(files)
      .where(eq(files.id, avatarId))
    expect(row!.storageKey).toMatch(/^avatar\/\d{4}\/\d{2}\/[0-9a-f-]+\.webp$/)
    expect(existsSync(join(uploads, row!.storageKey))).toBe(true)
  })

  it('tipo pelos bytes e limites de tamanho', async () => {
    const disguised = await http
      .post('/v1/files')
      .set(ana)
      .field('purpose', 'AVATAR')
      .attach('file', PDF, { filename: 'foto.jpg', contentType: 'image/jpeg' })
      .expect(400)
    expect(disguised.body.code).toBe('FILE_TYPE_NOT_ALLOWED')

    const big = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff]),
      Buffer.alloc(6 * 1024 * 1024),
    ])
    const tooLarge = await http
      .post('/v1/files')
      .set(ana)
      .field('purpose', 'AVATAR')
      .attach('file', big, 'grande.jpg')
      .expect(413)
    expect(tooLarge.body.code).toBe('FILE_TOO_LARGE')

    await http.post('/v1/files').set(ana).field('purpose', 'AVATAR').expect(400)
  })

  it('imagem do curso só para quem gerencia o curso', async () => {
    const cover = async (who: Record<string, string>) =>
      http
        .post('/v1/files')
        .set(who)
        .field('purpose', 'POST_COVER')
        .field('courseId', courseId)
        .attach('file', await photo(), 'capa.jpg')
    expect((await cover(ana)).status).toBe(403)
    expect((await cover(admin)).status).toBe(201)
  })

  it('certificado é privado: só o dono lê', async () => {
    const certificate = await http
      .post('/v1/files')
      .set(ana)
      .field('purpose', 'CERTIFICATE')
      .attach('file', PDF, 'Certificado de extensão.pdf')
      .expect(201)
    expect(certificate.body).toMatchObject({
      visibility: 'PRIVATE',
      mimeType: 'application/pdf',
    })
    const path = `/v1/files/${certificate.body.id}`
    await http.get(path).expect(404)
    await http.get(path).set(bia).expect(404)
    const own = await asBuffer(http.get(path).set(ana)).expect(200)
    expect(own.headers['cache-control']).toBe('private, no-store')
    expect(own.headers['content-disposition']).toContain(
      encodeURIComponent('Certificado de extensão.pdf'),
    )
    expect(binary(own).toString('latin1')).toContain('%PDF-1.4')
  })

  it('foto de perfil liga o arquivo; trocar solta a anterior e a limpeza apaga', async () => {
    await http
      .put('/v1/me/avatar')
      .set(bia)
      .send({ fileId: avatarId })
      .expect(404)
    const me = await http
      .put('/v1/me/avatar')
      .set(ana)
      .send({ fileId: avatarId })
      .expect(200)
    expect(me.body.avatarFileId).toBe(avatarId)
    expect(
      (await http.get('/v1/me').set(ana).expect(200)).body.avatarFileId,
    ).toBe(avatarId)

    const second = await http
      .post('/v1/files')
      .set(ana)
      .field('purpose', 'AVATAR')
      .attach('file', await photo(), 'nova.jpg')
      .expect(201)
    await http
      .put('/v1/me/avatar')
      .set(ana)
      .send({ fileId: second.body.id })
      .expect(200)

    const [old] = await database.db
      .select()
      .from(files)
      .where(eq(files.id, avatarId))
    expect(old!.deletedAt).not.toBeNull()

    const removed = await app.get(CleanupFilesUseCase).execute()
    expect(removed).toBeGreaterThanOrEqual(1)
    expect(existsSync(join(uploads, old!.storageKey))).toBe(false)
    await http.get(`/v1/files/${avatarId}`).expect(404)
    // A atual continua
    await http.get(`/v1/files/${second.body.id}`).expect(200)

    expect(
      (await http.delete('/v1/me/avatar').set(ana).expect(200)).body
        .avatarFileId,
    ).toBeNull()
  })
})
