import { z } from 'zod'

const ufcStudentEmailSchema = z
  .email('Insira um e-mail válido')
  .min(1, 'O e-mail é obrigatório')
  .refine((email) => email.toLowerCase().endsWith('@alu.ufc.br'), {
    message: 'Use um e-mail institucional @alu.ufc.br',
  })

export const signInSchema = z.object({
  email: ufcStudentEmailSchema,
  password: z.string().min(6, 'A senha deve conter pelo menos 6 caracteres'),
})

export type SignInSchema = z.infer<typeof signInSchema>

export const signUpSchema = z
  .object({
    name: z
      .string()
      .min(2, 'O nome deve conter pelo menos 2 caracteres')
      .max(100, 'Nome muito longo'),

    email: ufcStudentEmailSchema,

    password: z.string().min(6, 'A senha deve conter pelo menos 6 caracteres'),

    passwordConfirmation: z
      .string()
      .min(6, 'A senha deve conter pelo menos 6 caracteres'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'As senhas não coincidem',
    path: ['passwordConfirmation'],
  })

export type SignUpSchema = z.infer<typeof signUpSchema>
