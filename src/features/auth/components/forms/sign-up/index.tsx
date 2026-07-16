'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { FormInput } from '@/components/forms/form-input'
import { Button } from '@/components/ui/button'
import { signUpSchema, type SignUpSchema } from '../../../schemas/auth.schema'
import { useSignUp } from '../../../mutations/use-sign-up'

export function SignUpForm() {
  const router = useRouter()

  const { control, handleSubmit } = useForm<SignUpSchema>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    },
  })

  const { mutateAsync: signUpUser, isPending } = useSignUp()

  const handleSignUp = async (data: SignUpSchema) => {
    await signUpUser(data)
    router.replace('/')
  }

  return (
    <form
      onSubmit={handleSubmit(handleSignUp)}
      className="flex w-full flex-col gap-2"
    >
      <FormInput
        control={control}
        name="name"
        label="Nome"
        placeholder="Digite seu nome"
      />

      <FormInput
        control={control}
        name="email"
        label="Email"
        type="email"
        placeholder="Digite seu email"
      />

      <FormInput
        control={control}
        name="password"
        label="Senha"
        type="password"
        placeholder="Digite sua senha"
      />

      <FormInput
        control={control}
        name="passwordConfirmation"
        label="Confirme sua senha"
        type="password"
        placeholder="Digite sua senha"
      />

      <div className="flex w-full flex-col gap-2">
        <Button type="submit" isLoading={isPending} className="mt-2" size="lg">
          Registrar-se
        </Button>
        <Link href="/entrar" className="w-full">
          <Button type="button" size="sm" variant="ghost" className="w-full">
            Já possui uma conta?
            <span className="text-primary hover:underline">Entre aqui</span>
          </Button>
        </Link>
      </div>
    </form>
  )
}
