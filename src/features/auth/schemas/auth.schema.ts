import { z } from 'zod'

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'O e-mail é obrigatório')
    .email('Insira um e-mail válido'),
  password: z.string().min(6, 'A senha deve conter pelo menos 6 caracteres'),
})

export type SignInSchema = z.infer<typeof signInSchema>

export const signUpSchema = z.object({
  name: z
    .string()
    .min(2, 'O nome deve conter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  email: z
    .string()
    .min(1, 'O e-mail é obrigatório')
    .email('Insira um e-mail válido'),
  password: z.string().min(6, 'A senha deve conter pelo menos 6 caracteres'),
})

export type SignUpSchema = z.infer<typeof signUpSchema>
