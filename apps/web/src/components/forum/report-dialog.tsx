'use client'

import type { ReportReason } from '@ufc-flow/contracts'
import { useState, useTransition, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { REPORT_REASONS } from '@/data/report-reasons'
import { reportAction } from '@/lib/forum/forum-actions'
import { cn } from '@/lib/utils'

const REASONS = Object.keys(REPORT_REASONS) as ReportReason[]

// Denúncia: uma por pessoa, com motivo; 3 de pessoas diferentes ocultam a
// mensagem até a moderação decidir
export function ReportDialog({
  messageId,
  open,
  onOpenChange,
}: {
  messageId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [isSending, startSending] = useTransition()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!reason) return
    startSending(async () => {
      const result = await reportAction(messageId, { reason, details })
      if (!result.ok) {
        toast.error(result.problem.detail ?? 'Não foi possível denunciar')
        return
      }
      toast.success('Denúncia enviada. A moderação vai olhar.')
      onOpenChange(false)
      setReason(null)
      setDetails('')
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Denunciar mensagem</DialogTitle>
          <DialogDescription>
            A moderação do curso recebe a denúncia com o texto de agora, mesmo
            que ele seja editado depois.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Motivo</legend>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((value) => (
                <label
                  key={value}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center rounded-xl border px-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                    reason === value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:bg-muted',
                  )}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    className="sr-only"
                    checked={reason === value}
                    onChange={() => setReason(value)}
                  />
                  {REPORT_REASONS[value]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-2">
            <label htmlFor="report-details" className="text-sm font-medium">
              Detalhes (opcional)
            </label>
            <textarea
              id="report-details"
              rows={3}
              maxLength={500}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!reason} isLoading={isSending}>
              Denunciar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
