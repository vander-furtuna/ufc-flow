import { describe, expect, it } from 'vitest'

import {
  Argon2PasswordHasher,
  CryptoOpaqueTokens,
  JoseAccessTokens,
} from './security-adapters'

const now = new Date('2026-11-01T12:00:00Z')

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher()

  it('gera hash argon2id e confere a senha', async () => {
    const hash = await hasher.hash('uma senha longa')
    expect(hash).toMatch(/^\$argon2id\$/)
    expect(await hasher.verify(hash, 'uma senha longa')).toBe(true)
    expect(await hasher.verify(hash, 'outra senha')).toBe(false)
  })

  it('hash malformado não confere nem quebra', async () => {
    expect(await hasher.verify('lixo', 'qualquer')).toBe(false)
  })
})

describe('JoseAccessTokens', () => {
  const tokens = new JoseAccessTokens('s'.repeat(32), 900)

  it('emite e valida um JWT de 15 minutos', async () => {
    const issued = await tokens.issue({ userId: 'u1' }, new Date())
    expect(await tokens.verify(issued.token)).toEqual({ userId: 'u1' })
  })

  it('calcula a expiração a partir do relógio', async () => {
    const issued = await tokens.issue({ userId: 'u1' }, now)
    expect(issued.expiresAt).toEqual(new Date('2026-11-01T12:15:00Z'))
  })

  it('recusa token expirado, de outra chave ou malformado', async () => {
    const old = await tokens.issue({ userId: 'u1' }, now)
    expect(await tokens.verify(old.token)).toBeNull()
    const other = new JoseAccessTokens('o'.repeat(32), 900)
    const foreign = await other.issue({ userId: 'u1' }, new Date())
    expect(await tokens.verify(foreign.token)).toBeNull()
    expect(await tokens.verify('nao.e.jwt')).toBeNull()
  })
})

describe('CryptoOpaqueTokens', () => {
  const tokens = new CryptoOpaqueTokens()

  it('gera tokens únicos e guarda só o SHA-256', () => {
    const a = tokens.generate()
    const b = tokens.generate()
    expect(a.token).not.toBe(b.token)
    expect(a.token).toHaveLength(43)
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(tokens.hash(a.token)).toBe(a.hash)
  })
})
