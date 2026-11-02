'use client'

import { PlusIcon } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createCurriculumAction } from '@/lib/catalog/admin-actions'

import {
  CurriculumHeaderForm,
  EMPTY_HEADER,
} from '../_components/curriculum-header-form'

// EC criada à mão: nasce rascunho e vazia (o caminho comum é a extensão)
export function CreateCurriculumButton({ courseId }: { courseId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusIcon className="mr-1.5 size-4" />
          Nova estrutura
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova estrutura curricular</DialogTitle>
          <DialogDescription>
            Nasce como rascunho e vazia. Para trazer as disciplinas do SIGAA,
            use a extensão.
          </DialogDescription>
        </DialogHeader>
        <CurriculumHeaderForm
          initial={EMPTY_HEADER}
          submitLabel="Criar rascunho"
          pending={pending}
          onSubmit={({ sigaaId, ...header }) =>
            startTransition(async () => {
              const result = await createCurriculumAction(courseId, {
                ...header,
                sigaaId,
              })
              if (!result.ok) {
                toast.error(result.problem.detail ?? 'Não foi possível criar')
                return
              }
              setOpen(false)
              router.push(`/admin/estruturas/${result.data.id}`)
            })
          }
        />
      </DialogContent>
    </Dialog>
  )
}
