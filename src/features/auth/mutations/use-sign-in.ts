'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signInAction } from '../services/actions'
import { SignInSchema } from '../schemas/auth.schema'
import { AUTH_USER_QUERY_KEY } from '../constants/query-keys'
import { toast } from 'sonner'

export function useSignIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: SignInSchema) => {
      const response = await signInAction(data)
      if (response.error) {
        throw new Error(response.error)
      }
      return response.data
    },
    onSuccess: (user) => {
      // Atualiza o estado do usuário logado na cache do TanStack Query
      queryClient.setQueryData([AUTH_USER_QUERY_KEY], user)
      toast.success(`Bem-vindo de volta, ${user?.name}!`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Falha ao autenticar.')
    },
  })
}
