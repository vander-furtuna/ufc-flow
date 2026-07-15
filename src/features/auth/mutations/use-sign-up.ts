'use client'

import { useMutation } from '@tanstack/react-query'
import { signUpAction } from '../services/actions'
import { SignUpSchema } from '../schemas/auth.schema'
import { toast } from 'sonner'

export function useSignUp() {
  return useMutation({
    mutationFn: async (data: SignUpSchema) => {
      const response = await signUpAction(data)
      if (response.error) {
        throw new Error(response.error)
      }
      return response.data
    },
    onSuccess: () => {
      toast.success(
        `Cadastro realizado com sucesso! Faça login para continuar.`,
      )
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao realizar cadastro.')
    },
  })
}
