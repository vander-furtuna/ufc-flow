import { randomBytes, randomUUID } from 'node:crypto'
import { parseArgs } from 'node:util'

import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

import * as schema from '../database/schema'
import {
  checkPassword,
  normalizeEmail,
} from '../modules/identity/domain/credentials'
import { identityRepositories } from '../modules/identity/infrastructure/persistence/drizzle-identity'
import { Argon2PasswordHasher } from '../modules/identity/infrastructure/security/security-adapters'

// Cria o primeiro admin, que ninguém mais pode aprovar (modelagem, Lacunas).
// Se o e-mail já tem conta, só dá o papel ADMIN.
//   pnpm --filter @ufc-flow/api seed:admin --email voce@ufc.br --name "Seu Nome"
// A senha vem de SEED_ADMIN_PASSWORD ou é gerada e mostrada uma vez.
const { values } = parseArgs({
  options: { email: { type: 'string' }, name: { type: 'string' } },
})
if (!values.email || !values.name) {
  throw new Error('Use --email e --name')
}

const url = process.env.DATABASE_URL
if (!url) throw new Error('Defina DATABASE_URL (veja apps/api/.env.example)')

const email = normalizeEmail(values.email)
const generated = !process.env.SEED_ADMIN_PASSWORD
const password =
  process.env.SEED_ADMIN_PASSWORD ?? randomBytes(18).toString('base64url')
checkPassword(password)

const pool = new pg.Pool({ connectionString: url })
const db = drizzle(pool, { schema })

try {
  const now = new Date()
  const created = await db.transaction(async (tx) => {
    const { users, audit } = identityRepositories(tx)
    let user = await users.findByEmail(email)
    const isNew = !user
    if (!user) {
      user = {
        id: randomUUID(),
        name: values.name!.trim(),
        email,
        passwordHash: await new Argon2PasswordHasher().hash(password),
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      }
      await users.insert(user)
    }
    await users.addRole(user.id, 'ADMIN', null, now)
    await audit.record({
      id: randomUUID(),
      actorId: null,
      module: 'identity',
      entity: 'user',
      entityId: user.id,
      action: 'role.granted',
      changes: { role: 'ADMIN', via: 'seed:admin' },
      createdAt: now,
    })
    return isNew
  })

  console.log(
    created
      ? `Admin criado: ${email}${generated ? `\nSenha (anote agora, não será mostrada de novo): ${password}` : ''}`
      : `${email} já tinha conta e agora é admin`,
  )
} finally {
  await pool.end()
}
