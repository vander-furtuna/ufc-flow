'use client'

import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import Link from 'next/link'
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
} from '@/components/ui/dialog'
import { deletePostAction } from '@/lib/hub/hub-actions'
import { useInvalidateHub } from '@/lib/hub/use-hub'

// Editar e excluir, só para quem modera o curso
export function PostActions({
  postId,
  editHref,
  hubHref,
}: {
  postId: string
  editHref: string
  hubHref: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [isDeleting, startDeleting] = useTransition()
  const router = useRouter()
  const invalidate = useInvalidateHub()

  const remove = () =>
    startDeleting(async () => {
      const result = await deletePostAction(postId)
      if (!result.ok) {
        toast.error(result.problem.detail ?? 'Não foi possível excluir o post')
        return
      }
      await invalidate()
      toast.success('Post excluído')
      router.push(hubHref)
    })

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" className="h-10">
        <Link href={editHref}>
          <PencilSimpleIcon aria-hidden className="size-4" />
          Editar
        </Link>
      </Button>
      <Button
        variant="outline"
        className="h-10 text-destructive hover:text-destructive"
        onClick={() => setConfirming(true)}
      >
        <TrashIcon aria-hidden className="size-4" />
        Excluir
      </Button>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir este post?</DialogTitle>
            <DialogDescription>
              Ele sai do hub e dos próximos prazos. Para só tirar do ar e
              guardar, edite e marque como arquivado.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={remove}
            >
              {isDeleting ? 'Excluindo…' : 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
