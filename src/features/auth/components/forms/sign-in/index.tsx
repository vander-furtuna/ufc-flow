'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { FormInput } from '@/components/forms/form-input'
import { Button } from '@/components/ui/button'
import { signInSchema, type SignInSchema } from '../../../schemas/auth.schema'
import { useSignIn } from '../../../mutations/use-sign-in'

export function SignInForm() {
  const router = useRouter()

  const { control, handleSubmit } = useForm<SignInSchema>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const { mutateAsync: signInUser, isPending } = useSignIn()

  const handleSignIn = async (data: SignInSchema) => {
    await signInUser(data)
    router.replace('/')
  }

  return (
    <form
      onSubmit={handleSubmit(handleSignIn)}
      className="flex w-full flex-col gap-2"
    >
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

      <div className="flex w-full flex-col gap-2">
        <Button type="submit" isLoading={isPending} className="mt-2" size="lg">
          Entrar
        </Button>
        <Link href="/registrar-se" className="w-full">
          <Button type="submit" size="sm" variant="ghost" className="w-full">
            Não possui uma conta? Registre-se
          </Button>
        </Link>
      </div>
    </form>
  )
}
