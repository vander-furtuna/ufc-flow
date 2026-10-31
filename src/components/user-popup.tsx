'use client'

import { UserIcon } from '@phosphor-icons/react'
import { useCallback } from 'react'
import { toast } from 'sonner'

export function UserPopup() {
  const handleOpenUserPopup = useCallback(() => {
    toast.info('Essa funcionalidade ainda não está disponível.')
  }, [])

  return (
    <button
      className="bg-foreground ring-muted-foreground/25 center flex size-12 rounded-full opacity-30 ring-1"
      onClick={handleOpenUserPopup}
    >
      <UserIcon weight="bold" className="text-muted size-6" />
    </button>
  )
}
