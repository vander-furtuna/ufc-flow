import { createHash, randomBytes } from 'node:crypto'

import { hash, verify } from '@node-rs/argon2'
import { jwtVerify, SignJWT } from 'jose'

import type {
  AccessTokens,
  OpaqueTokens,
  PasswordHasher,
} from '../../domain/ports'

// argon2id (o padrão da biblioteca) com os parâmetros recomendados pelo
// OWASP: 19 MiB, 2 passadas
export class Argon2PasswordHasher implements PasswordHasher {
  hash(password: string) {
    return hash(password, {
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    })
  }

  async verify(passwordHash: string, password: string) {
    try {
      return await verify(passwordHash, password)
    } catch {
      return false
    }
  }
}

const ISSUER = 'ufc-flow'

// Token de acesso: JWT HS256 curto. A API confia nele sem ir ao banco; o
// ator (papéis, cursos moderados) é carregado a cada caso de uso.
export class JoseAccessTokens implements AccessTokens {
  private readonly key: Uint8Array

  constructor(
    secret: string,
    private readonly ttlSeconds: number,
  ) {
    this.key = new TextEncoder().encode(secret)
  }

  async issue({ userId }: { userId: string }, now: Date) {
    const issuedAt = Math.floor(now.getTime() / 1000)
    const expiresAt = new Date((issuedAt + this.ttlSeconds) * 1000)
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setIssuedAt(issuedAt)
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.key)
    return { token, expiresAt }
  }

  async verify(token: string) {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        issuer: ISSUER,
        algorithms: ['HS256'],
      })
      return typeof payload.sub === 'string' ? { userId: payload.sub } : null
    } catch {
      return null
    }
  }
}

// Tokens de renovação e de redefinição: 256 bits aleatórios; o banco guarda
// só o SHA-256
export class CryptoOpaqueTokens implements OpaqueTokens {
  generate() {
    const token = randomBytes(32).toString('base64url')
    return { token, hash: this.hash(token) }
  }

  hash(token: string) {
    return createHash('sha256').update(token).digest('hex')
  }
}
