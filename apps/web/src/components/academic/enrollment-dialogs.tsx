'use client'

import type { EnrollmentView } from '@ufc-flow/contracts'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useCourse } from '@/contexts/course'
import {
  useChangeCurriculum,
  useEnrollments,
} from '@/lib/academic-record/use-academic'

import { EnrollmentForm, nativeSelect } from './enrollment-form'

const STATUS_TEXT: Record<EnrollmentView['status'], string> = {
  ACTIVE: 'Ativa',
  TRANSFERRED: 'Transferida',
  CONCLUDED: 'Concluída',
  CANCELED: 'Cancelada',
}

export function ManageEnrollmentsDialog({
  open,
  onOpenChange,
  current,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  current: EnrollmentView
}) {
  const { data: enrollments = [] } = useEnrollments()
  const [transferring, setTransferring] = useState(false)

  const close = (next: boolean) => {
    if (!next) setTransferring(false)
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {transferring ? 'Matrícula em outro curso' : 'Minhas matrículas'}
          </DialogTitle>
          <DialogDescription>
            {transferring
              ? 'É a transferência interna: a matrícula atual vira transferida e o histórico dela continua aqui. No novo curso, marque como Aproveitada o que for aproveitado.'
              : 'A atual é a que conta para o progresso e para o fórum do curso.'}
          </DialogDescription>
        </DialogHeader>

        {transferring ? (
          <EnrollmentForm
            excludeCourseSlug={current.course.slug}
            submitLabel="Transferir"
            onCancel={() => setTransferring(false)}
            onDone={() => close(false)}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-2">
              {enrollments.map((enrollment) => (
                <li
                  key={enrollment.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border p-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold">
                      {enrollment.course.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      EC {enrollment.curriculum.code} · Matrícula{' '}
                      {enrollment.registrationNumber}
                      {enrollment.entryTerm
                        ? ` · Ingresso ${enrollment.entryTerm}`
                        : ''}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium">
                    {enrollment.isCurrent
                      ? 'Atual'
                      : STATUS_TEXT[enrollment.status]}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="self-start"
              onClick={() => setTransferring(true)}
            >
              Matrícula em outro curso
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function ChangeCurriculumDialog({
  open,
  onOpenChange,
  enrollment,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  enrollment: EnrollmentView
}) {
  const { courses } = useCourse()
  const options =
    courses
      .find((course) => course.slug === enrollment.course.slug)
      ?.curriculumStructures.filter(
        (item) => item.slug !== enrollment.curriculum.slug,
      ) ?? []
  const [curriculumSlug, setCurriculumSlug] = useState('')
  const change = useChangeCurriculum()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    change.mutate(
      { enrollmentId: enrollment.id, curriculumSlug },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Migrar de estrutura curricular</DialogTitle>
          <DialogDescription>
            Hoje você segue a EC {enrollment.curriculum.code}. Os registros do
            histórico ficam e o progresso é recalculado com as equivalências.
          </DialogDescription>
        </DialogHeader>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este curso não tem outra estrutura publicada.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-curriculum">Nova estrutura</Label>
              <select
                id="new-curriculum"
                required
                value={curriculumSlug}
                onChange={(event) => setCurriculumSlug(event.target.value)}
                className={nativeSelect}
              >
                <option value="" disabled>
                  Escolha a EC
                </option>
                {options.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    EC {item.period}
                    {item.isCurrent ? ' (vigente)' : ''}
                  </option>
                ))}
              </select>
            </div>
            {change.error && (
              <p role="alert" className="text-sm text-destructive">
                {change.error.message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={change.isPending}>
                {change.isPending ? 'Migrando…' : 'Migrar'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
