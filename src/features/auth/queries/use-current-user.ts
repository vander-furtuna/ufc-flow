'use client'

import { useQuery } from '@tanstack/react-query'
import { getCurrentUserAction } from '../services/actions'

import { AUTH_USER_QUERY_KEY } from '../constants/query-keys'

export function useCurrentUser() {
  return useQuery({
    queryKey: [AUTH_USER_QUERY_KEY],
    queryFn: async () => {
      return getCurrentUserAction()
    },
    staleTime: 1000 * 60 * 10, // Cache de 10 minutos
  })
}
