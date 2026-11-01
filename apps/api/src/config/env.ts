import { z } from 'zod'

// Variáveis de ambiente da API, validadas na subida (modelo em .env.example)
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3333),
    DATABASE_URL: z.url(),
    // Assina os tokens de acesso (HS256)
    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET precisa de 32 caracteres ou mais'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    // Base dos links de redefinição de senha
    WEB_URL: z.url().default('http://localhost:3000'),
    SWAGGER_ENABLED: z.stringbool().default(true),
    SWAGGER_USER: z.string().min(1).optional(),
    SWAGGER_PASSWORD: z.string().min(1).optional(),
  })
  .refine(
    (env) =>
      env.NODE_ENV !== 'production' ||
      !env.SWAGGER_ENABLED ||
      (env.SWAGGER_USER && env.SWAGGER_PASSWORD),
    {
      message:
        'Em produção, o Swagger ligado exige SWAGGER_USER e SWAGGER_PASSWORD',
      path: ['SWAGGER_USER'],
    },
  )

export type Env = z.infer<typeof envSchema>

export const ENV = Symbol('Env')

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source)
  if (result.success) return result.data
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ')
  throw new Error(`Variáveis de ambiente inválidas: ${issues}`)
}
