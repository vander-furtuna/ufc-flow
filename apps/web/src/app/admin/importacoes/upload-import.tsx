'use client'

import { UploadSimpleIcon } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useRef, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { uploadImportAction } from '@/lib/catalog/admin-actions'

// Upload do JSON baixado pela extensão (mesmo endpoint, source=UPLOAD)
export function UploadImport() {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-label="Arquivo JSON da estrutura"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          startTransition(async () => {
            const result = await uploadImportAction(await file.text())
            if (!result.ok) {
              toast.error(result.problem.detail ?? 'Não foi possível enviar')
              return
            }
            toast.success('Arquivo recebido')
            router.push(`/admin/importacoes/${result.data.id}`)
          })
        }}
      />
      <Button isLoading={pending} onClick={() => input.current?.click()}>
        <UploadSimpleIcon className="mr-1.5 size-4" />
        Enviar JSON
      </Button>
    </>
  )
}
