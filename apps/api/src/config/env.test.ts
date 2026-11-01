import { describe, expect, it } from 'vitest'

import { parseEnv } from './env'

const base = {
  DATABASE_URL: 'postgres://ufcflow:ufcflow@localhost:5432/ufcflow',
  JWT_SECRET: 'x'.repeat(32),
}

describe('parseEnv', () => {
  it('usa os padrões de desenvolvimento', () => {
    expect(parseEnv(base)).toEqual({
      NODE_ENV: 'development',
      PORT: 3333,
      DATABASE_URL: base.DATABASE_URL,
      JWT_SECRET: base.JWT_SECRET,
      ACCESS_TOKEN_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 30,
      WEB_URL: 'http://localhost:3000',
      SWAGGER_ENABLED: true,
    })
  })

  it('lê números e booleanos das variáveis', () => {
    expect(
      parseEnv({ ...base, PORT: '4000', SWAGGER_ENABLED: 'false' }),
    ).toMatchObject({ PORT: 4000, SWAGGER_ENABLED: false })
  })

  it('exige segredo do JWT com 32 caracteres ou mais', () => {
    expect(() => parseEnv({ ...base, JWT_SECRET: 'curto' })).toThrow(
      /JWT_SECRET/,
    )
  })

  it('em produção, o Swagger ligado exige usuário e senha', () => {
    expect(() => parseEnv({ ...base, NODE_ENV: 'production' })).toThrow(
      /SWAGGER_USER/,
    )
    expect(
      parseEnv({
        ...base,
        NODE_ENV: 'production',
        SWAGGER_USER: 'admin',
        SWAGGER_PASSWORD: 'senha-forte',
      }).SWAGGER_USER,
    ).toBe('admin')
    expect(
      parseEnv({ ...base, NODE_ENV: 'production', SWAGGER_ENABLED: 'false' })
        .SWAGGER_ENABLED,
    ).toBe(false)
  })
})
