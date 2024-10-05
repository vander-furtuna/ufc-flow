'use client'

import { User } from 'lucide-react'
import { useCallback } from 'react'
import { toast } from 'sonner'

export function UserPopup() {
  const handleOpenUserPopup = useCallback(() => {
    toast.info('Essa funcionalidade ainda não está disponível.')
  }, [])

  return (
    <button
      className="bg-foreground rounded-full size-12 flex center ring-1 ring-muted-foreground/25 opacity-30"
      onClick={handleOpenUserPopup}
    >
      <User className="text-muted size-6" />
    </button>
  )
}
