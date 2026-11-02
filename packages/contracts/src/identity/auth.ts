import { z } from 'zod'

import { isoDateTimeSchema, uuidSchema } from '../common/primitives'
import { userRoleSchema, userStatusSchema } from '../enums'

// Sem regra de composição (orientação do NIST): só o tamanho
export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres')
  .max(128, 'A senha pode ter até 128 caracteres')

export const emailSchema = z.email('E-mail inválido').max(254)

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Informe seu nome')
  .max(120, 'Nome longo demais')

const consent = (message: string) => z.literal(true, { error: () => message })

export const signUpInputSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    acceptTerms: consent('É preciso aceitar os Termos de uso'),
    acceptPrivacy: consent('É preciso aceitar a Política de privacidade'),
  })
  .meta({ id: 'SignUpInput' })

export const signInInputSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Informe a senha').max(128),
  })
  .meta({ id: 'SignInInput' })

export const refreshInputSchema = z
  .object({ refreshToken: z.string().min(1) })
  .meta({ id: 'RefreshInput' })

export const resetPasswordInputSchema = z
  .object({ token: z.string().min(1), password: passwordSchema })
  .meta({ id: 'ResetPasswordInput' })

export const courseSummarySchema = z
  .object({ id: uuidSchema, slug: z.string(), name: z.string() })
  .meta({ id: 'CourseSummary' })

export const meSchema = z
  .object({
    id: uuidSchema,
    name: z.string(),
    email: z.string(),
    status: userStatusSchema,
    roles: z.array(userRoleSchema),
    moderatedCourses: z.array(courseSummarySchema),
    // Foto de perfil (arquivo público); null mostra as iniciais
    avatarFileId: uuidSchema.nullable(),
    createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'Me' })

export const authTokensSchema = z
  .object({
    tokenType: z.literal('Bearer'),
    accessToken: z.string(),
    accessTokenExpiresAt: isoDateTimeSchema,
    refreshToken: z.string(),
    refreshTokenExpiresAt: isoDateTimeSchema,
  })
  .meta({ id: 'AuthTokens' })

export const authSessionSchema = z
  .object({ user: meSchema, tokens: authTokensSchema })
  .meta({ id: 'AuthSession' })

// Link de uso único gerado por um admin (sem SMTP na v2)
export const passwordResetLinkSchema = z
  .object({ url: z.url(), expiresAt: isoDateTimeSchema })
  .meta({ id: 'PasswordResetLink' })

export type SignUpInput = z.infer<typeof signUpInputSchema>
export type SignInInput = z.infer<typeof signInInputSchema>
export type RefreshInput = z.infer<typeof refreshInputSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>
export type CourseSummary = z.infer<typeof courseSummarySchema>
export type Me = z.infer<typeof meSchema>
export type AuthTokens = z.infer<typeof authTokensSchema>
export type AuthSession = z.infer<typeof authSessionSchema>
export type PasswordResetLink = z.infer<typeof passwordResetLinkSchema>
