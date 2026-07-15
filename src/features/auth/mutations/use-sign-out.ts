'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signOutAction } from '../services/actions'
import { AUTH_USER_QUERY_KEY } from '../constants/query-keys'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function useSignOut() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async () => {
      const response = await signOutAction()
      return response
    },
    onSuccess: () => {
      // Limpa a cache de usuário autenticado
      queryClient.setQueryData([AUTH_USER_QUERY_KEY], null)

      // Opcional: limpa todo o cache de queries do React Query para não vazar dados de outro usuário
      queryClient.clear()

      toast.success('Você saiu da sua conta.')
      router.push('/login')
    },
    onError: () => {
      toast.error('Erro ao realizar logout.')
    },
  })
}
