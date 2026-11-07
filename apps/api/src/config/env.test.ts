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
      TRUST_PROXY_HOPS: 1,
      DATABASE_URL: base.DATABASE_URL,
      JWT_SECRET: base.JWT_SECRET,
      ACCESS_TOKEN_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 30,
      WEB_URL: 'http://localhost:3000',
      SWAGGER_ENABLED: true,
      SIGAA_SYNC_ENABLED: true,
      CLASSES_SYNC_ENABLED: true,
      CLASSES_SYNC_PAUSE_MS: 5000,
      UPLOADS_DIR: './data/uploads',
      FORUM_RATE_BURST: 1,
      FORUM_RATE_BURST_SECONDS: 10,
      FORUM_RATE_HOURLY: 30,
      EVALUATION_REQUIRE_INSTITUTIONAL_EMAIL: false,
    })
  })

  it('lê números e booleanos das variáveis', () => {
    expect(
      parseEnv({ ...base, PORT: '4000', SWAGGER_ENABLED: 'false' }),
    ).toMatchObject({ PORT: 4000, SWAGGER_ENABLED: false })
  })

  it('variável vazia vale como ausente', () => {
    expect(
      parseEnv({
        ...base,
        NODE_ENV: 'production',
        SWAGGER_ENABLED: 'false',
        SWAGGER_USER: '',
        SWAGGER_PASSWORD: '',
        TRUST_PROXY_HOPS: '',
      }),
    ).toMatchObject({ SWAGGER_ENABLED: false, TRUST_PROXY_HOPS: 1 })
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
