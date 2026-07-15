'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthContext } from '@/contexts/auth'
import { useSignIn } from '@/features/auth/mutations/use-sign-in'
import { signInSchema, SignInSchema } from '@/features/auth/schemas/auth.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldError,
  FieldGroup,
} from '@/components/ui/field'
import Link from 'next/link'
import { GraduationCap, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthContext()
  const { mutate: signIn, isPending } = useSignIn()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInSchema>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Redireciona se já estiver autenticado
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.push('/cursos')
    }
  }, [isAuthenticated, isAuthLoading, router])

  const onSubmit = (data: SignInSchema) => {
    signIn(data, {
      onSuccess: () => {
        router.push('/cursos')
      },
    })
  }

  if (isAuthLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-700 border-t-blue-500" />
          <p className="text-sm text-zinc-400">Verificando sessão...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="pointer-events-none absolute top-0 left-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-900/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-[500px] w-[500px] translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-900/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h2 className="mt-6 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
            Acesse o UFC Flow
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Gerencie sua grade de forma dinâmica e descomplicada
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-8 shadow-2xl backdrop-blur-xl">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field>
                <FieldContent>
                  <FieldLabel htmlFor="email" className="text-zinc-300">
                    E-mail
                  </FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplo@ufc.br"
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-600 focus:border-blue-500 focus:ring-blue-500/20"
                    {...register('email')}
                  />
                  <FieldError errors={[errors.email]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldContent>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="password" className="text-zinc-300">
                      Senha
                    </FieldLabel>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-600 focus:border-blue-500 focus:ring-blue-500/20"
                    {...register('password')}
                  />
                  <FieldError errors={[errors.password]} />
                </FieldContent>
              </Field>
            </FieldGroup>

            <Button
              type="submit"
              disabled={isPending}
              className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 font-medium text-white shadow-lg shadow-blue-500/20 transition-all duration-200 hover:from-blue-500 hover:to-indigo-500"
            >
              {isPending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-zinc-500">Novo na plataforma?</span>{' '}
            <Link
              href="/cadastro"
              className="font-medium text-blue-500 transition-colors hover:text-blue-400"
            >
              Criar uma conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
