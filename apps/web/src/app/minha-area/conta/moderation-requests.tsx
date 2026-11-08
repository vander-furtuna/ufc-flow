'use client'

import type { CourseSummary, ModeratorRequestStatus } from '@ufc-flow/contracts'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState, useTransition, type FormEvent } from 'react'
import { toast } from 'sonner'

import { nativeSelect } from '@/components/academic/native-select'
import { FieldError } from '@/components/auth/form-parts'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  cancelModeratorRequestAction,
  myModeratorRequestsAction,
  requestModerationAction,
} from '@/lib/account/account-actions'
import { cn } from '@/lib/utils'

export const MY_REQUESTS_KEY = ['account', 'moderator-requests'] as const

const STATUS: Record<ModeratorRequestStatus, { label: string; tone: string }> =
  {
    PENDING: {
      label: 'Aguardando um admin',
      tone: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    },
    APPROVED: {
      label: 'Aprovado',
      tone: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    },
    REJECTED: {
      label: 'Recusado',
      tone: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
    },
    CANCELED: { label: 'Cancelado', tone: 'bg-muted text-muted-foreground' },
  }

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeZone: 'America/Fortaleza',
})

// Pedido de moderação de um curso (modelagem, Usuários): a pessoa conta por
// que quer moderar e um admin aprova ou recusa em Admin › Moderação
export function ModerationRequests({
  courses,
  moderatedCourses,
}: {
  courses: CourseSummary[]
  moderatedCourses: CourseSummary[]
}) {
  const queryClient = useQueryClient()
  const courseId = useId()
  const textId = useId()
  const errorId = useId()
  const [course, setCourse] = useState('')
  const [justification, setJustification] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [isSending, startSending] = useTransition()

  const requests = useQuery({
    queryKey: MY_REQUESTS_KEY,
    queryFn: async () => {
      const result = await myModeratorRequestsAction()
      if (!result.ok) throw new Error(result.problem.detail ?? 'Indisponível')
      return result.data
    },
  })
  const list = requests.data ?? []
  const blocked = new Set([
    ...moderatedCourses.map((item) => item.id),
    ...list
      .filter((item) => item.status === 'PENDING')
      .map((item) => item.course.id),
  ])
  const available = courses.filter((item) => !blocked.has(item.id))

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: MY_REQUESTS_KEY })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!course) {
      setError('Escolha o curso')
      return
    }
    startSending(async () => {
      const result = await requestModerationAction(course, justification)
      if (!result.ok) {
        setError(result.problem.detail ?? 'Não foi possível enviar o pedido')
        return
      }
      setCourse('')
      setJustification('')
      toast.success('Pedido enviado', {
        description: 'Você recebe uma notificação quando um admin responder.',
      })
      await refresh()
    })
  }

  const cancel = (id: string) =>
    startSending(async () => {
      const result = await cancelModeratorRequestAction(id)
      if (!result.ok) {
        toast.error(result.problem.detail ?? 'Não foi possível cancelar')
        return
      }
      await refresh()
    })

  return (
    <div className="flex flex-col gap-4">
      {moderatedCourses.length > 0 && (
        <p className="text-sm">
          Você modera:{' '}
          <strong>
            {moderatedCourses.map((item) => item.name).join(', ')}
          </strong>
          .
        </p>
      )}
      {list.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Seus pedidos">
          {list.map((request) => (
            <li
              key={request.id}
              className="flex flex-col gap-1 rounded-xl border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{request.course.name}</span>
                <span className="text-xs text-muted-foreground">
                  Pedido em {dateFormat.format(new Date(request.createdAt))}
                  {request.reviewNote ? ` · ${request.reviewNote}` : ''}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    STATUS[request.status].tone,
                  )}
                >
                  {STATUS[request.status].label}
                </span>
                {request.status === 'PENDING' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isSending}
                    onClick={() => cancel(request.id)}
                  >
                    Cancelar
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {available.length > 0 ? (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={courseId}>Curso</Label>
            <select
              id={courseId}
              value={course}
              onChange={(event) => {
                setCourse(event.target.value)
                setError(undefined)
              }}
              className={cn(nativeSelect, 'h-11')}
            >
              <option value="">Escolha o curso</option>
              {available.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={textId}>Por que você quer moderar?</Label>
            <textarea
              id={textId}
              value={justification}
              onChange={(event) => {
                setJustification(event.target.value)
                setError(undefined)
              }}
              rows={4}
              maxLength={1000}
              placeholder="Por exemplo: sou do centro acadêmico e quero manter as notícias e a grade do curso em dia."
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className="rounded-[12px] border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
            <FieldError id={errorId} message={error} />
          </div>
          <Button
            type="submit"
            className="w-fit"
            disabled={isSending}
            aria-busy={isSending}
          >
            Pedir moderação
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Você já modera ou tem pedido aberto em todos os cursos.
        </p>
      )}
    </div>
  )
}
