'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { User } from '@/features/auth/types'
import { useCurrentUser } from '@/features/auth/queries/use-current-user'
import { useSignOut } from '@/features/auth/mutations/use-sign-out'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  signOut: () => void
  isLoggingOut: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser()
  const { mutate: signOut, isPending: isLoggingOut } = useSignOut()

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isAuthenticated,
        isLoading,
        signOut,
        isLoggingOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext deve ser usado dentro de um AuthProvider')
  }
  return context
}
