'use client'

import type { ReportReason, RestrictionType } from '@ufc-flow/contracts'
import { useId, useState, useTransition, type FormEvent } from 'react'

import { nativeSelect } from '@/components/academic/native-select'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { REPORT_REASONS } from '@/data/report-reasons'

// Prazo da restrição: "none" não restringe; null é sem prazo
export const DURATIONS = [
  ['none', 'Não silenciar'],
  ['1', '1 dia'],
  ['7', '7 dias'],
  ['30', '30 dias'],
  ['forever', 'Sem prazo'],
] as const

export type DurationValue = (typeof DURATIONS)[number][0]

export const daysOf = (value: DurationValue): number | null =>
  value === 'forever' ? null : Number(value)

export type ModerationChoice = {
  reason: string
  category: ReportReason | null
  restriction: { type: RestrictionType; days: number | null } | null
}

// Toda ação da moderação pede um motivo, que fica no registro. Remover pede
// também a categoria pública; algumas ações oferecem restringir o autor.
export function ModerationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  category,
  restriction,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  // Categoria pública da remoção, já com a sugestão (o motivo mais denunciado)
  category?: ReportReason
  // 'optional' oferece silenciar junto; 'required' é a própria restrição
  restriction?: 'optional' | 'required'
  onConfirm: (choice: ModerationChoice) => Promise<boolean>
}) {
  const id = useId()
  const [reason, setReason] = useState('')
  const [chosenCategory, setChosenCategory] = useState(category ?? 'OTHER')
  const [type, setType] = useState<RestrictionType>('MUTE')
  const [duration, setDuration] = useState<DurationValue>(
    restriction === 'required' ? '7' : 'none',
  )
  const [isSending, startSending] = useTransition()
  const valid = reason.trim().length >= 3

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    startSending(async () => {
      const done = await onConfirm({
        reason: reason.trim(),
        category: category ? chosenCategory : null,
        restriction:
          restriction && duration !== 'none'
            ? {
                type: restriction === 'required' ? type : 'MUTE',
                days: daysOf(duration),
              }
            : null,
      })
      if (done) {
        setReason('')
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {category && (
            <div className="flex flex-col gap-2">
              <label htmlFor={`${id}-category`} className="text-sm font-medium">
                Categoria (aparece para os leitores)
              </label>
              <select
                id={`${id}-category`}
                value={chosenCategory}
                onChange={(event) =>
                  setChosenCategory(event.target.value as ReportReason)
                }
                className={nativeSelect}
              >
                {Object.entries(REPORT_REASONS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {restriction === 'required' && (
            <fieldset className="flex min-w-0 flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Restrição</legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['MUTE', 'Silenciar', 'Lê, mas não escreve nem curte'],
                    ['BAN', 'Banir', 'Não acessa o fórum do curso'],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer flex-col rounded-xl border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                  >
                    <input
                      type="radio"
                      name={`${id}-type`}
                      className="sr-only"
                      checked={type === value}
                      onChange={() => setType(value)}
                    />
                    <span className="font-semibold">{label}</span>
                    <span className="text-xs text-muted-foreground">
                      {hint}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {restriction && (
            <div className="flex flex-col gap-2">
              <label htmlFor={`${id}-duration`} className="text-sm font-medium">
                {restriction === 'required'
                  ? 'Por quanto tempo'
                  : 'Silenciar o autor'}
              </label>
              <select
                id={`${id}-duration`}
                value={duration}
                onChange={(event) =>
                  setDuration(event.target.value as DurationValue)
                }
                className={nativeSelect}
              >
                {DURATIONS.filter(
                  ([value]) => restriction === 'optional' || value !== 'none',
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-reason`} className="text-sm font-medium">
              Motivo (fica no registro da moderação)
            </label>
            <textarea
              id={`${id}-reason`}
              rows={3}
              maxLength={300}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
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
            <Button
              type="submit"
              variant={destructive ? 'destructive' : 'default'}
              disabled={!valid}
              isLoading={isSending}
            >
              {confirmLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
