import { describe, expect, it } from 'vitest'

import {
  authSessionSchema,
  meSchema,
  passwordSchema,
  refreshInputSchema,
  resetPasswordInputSchema,
  signInInputSchema,
  signUpInputSchema,
} from './auth'

const me = {
  id: '0b8f6a3e-2c1d-4f5e-9a7b-3c2d1e0f9a8b',
  name: 'Ana Souza',
  email: 'ana@alu.ufc.br',
  status: 'ACTIVE',
  roles: ['ADMIN'],
  moderatedCourses: [
    {
      id: '1b8f6a3e-2c1d-4f5e-9a7b-3c2d1e0f9a8b',
      slug: 'engenharia-de-computacao-ufc-sobral',
      name: 'Engenharia de Computação',
    },
  ],
  avatarFileId: null,
  createdAt: '2026-11-01T12:00:00Z',
}

describe('passwordSchema', () => {
  it('aceita de 8 a 128 caracteres, sem regra de composição', () => {
    expect(passwordSchema.safeParse('abcdefgh').success).toBe(true)
    expect(passwordSchema.safeParse('a'.repeat(128)).success).toBe(true)
  })

  it('recusa senhas curtas ou longas demais', () => {
    expect(passwordSchema.safeParse('abcdefg').success).toBe(false)
    expect(passwordSchema.safeParse('a'.repeat(129)).success).toBe(false)
  })
})

describe('signUpInputSchema', () => {
  const valid = {
    name: 'Ana Souza',
    email: 'ana@alu.ufc.br',
    password: 'uma senha longa',
    acceptTerms: true,
    acceptPrivacy: true,
  }

  it('aceita o cadastro com os dois aceites', () => {
    expect(signUpInputSchema.parse(valid)).toEqual(valid)
  })

  it('exige os aceites de Termos e Privacidade', () => {
    const result = signUpInputSchema.safeParse({
      ...valid,
      acceptTerms: false,
      acceptPrivacy: undefined,
    })
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ['acceptTerms'],
      ['acceptPrivacy'],
    ])
  })

  it('valida nome e e-mail', () => {
    const result = signUpInputSchema.safeParse({
      ...valid,
      name: ' ',
      email: 'ana',
    })
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ['name'],
      ['email'],
    ])
  })
})

describe('demais schemas de autenticação', () => {
  it('login, renovação e redefinição', () => {
    expect(
      signInInputSchema.safeParse({ email: 'ana@alu.ufc.br', password: 'x' })
        .success,
    ).toBe(true)
    expect(refreshInputSchema.safeParse({ refreshToken: '' }).success).toBe(
      false,
    )
    expect(
      resetPasswordInputSchema.safeParse({ token: 'abc', password: 'curta' })
        .success,
    ).toBe(false)
  })

  it('sessão com usuário e tokens', () => {
    const session = {
      user: me,
      tokens: {
        tokenType: 'Bearer',
        accessToken: 'a.b.c',
        accessTokenExpiresAt: '2026-11-01T12:15:00Z',
        refreshToken: 'r',
        refreshTokenExpiresAt: '2026-12-01T12:00:00Z',
      },
    }
    expect(authSessionSchema.parse(session)).toEqual(session)
    expect(meSchema.safeParse({ ...me, roles: ['ROOT'] }).success).toBe(false)
  })
})
