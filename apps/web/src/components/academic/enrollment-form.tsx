'use client'

import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useClass } from '@/contexts/class'
import { useCourse } from '@/contexts/course'
import { termOptions } from '@/lib/academic-record/history'
import { useCreateEnrollment } from '@/lib/academic-record/use-academic'
import { cn } from '@/lib/utils'

import { nativeSelect } from './native-select'

// Curso, EC, matrícula e ingresso. Em outro curso, vira transferência
// interna: a matrícula atual passa a TRANSFERRED.
export function EnrollmentForm({
  excludeCourseSlug,
  submitLabel = 'Salvar matrícula',
  onDone,
  onCancel,
}: {
  // O curso da matrícula atual: nele, a troca é pela migração de EC
  excludeCourseSlug?: string
  submitLabel?: string
  onDone?: () => void
  onCancel?: () => void
}) {
  const { courses } = useCourse()
  const { currentYear, currentSemester } = useClass()
  const available = courses.filter(
    (course) =>
      course.isActive !== false &&
      course.slug !== excludeCourseSlug &&
      course.curriculumStructures.length > 0,
  )
  const [courseSlug, setCourseSlug] = useState('')
  const course = available.find((item) => item.slug === courseSlug)
  const [curriculumSlug, setCurriculumSlug] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [entryTerm, setEntryTerm] = useState('')
  const create = useCreateEnrollment()

  const terms = termOptions(
    `${currentYear ?? 2026}.${currentSemester ?? 1}`,
    null,
  )

  const pickCourse = (slug: string) => {
    setCourseSlug(slug)
    const next = available.find((item) => item.slug === slug)
    const current =
      next?.curriculumStructures.find((item) => item.isCurrent) ??
      next?.curriculumStructures[0]
    setCurriculumSlug(current?.slug ?? '')
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    create.mutate(
      {
        courseSlug,
        curriculumSlug,
        registrationNumber,
        entryTerm: entryTerm || null,
      },
      { onSuccess: () => onDone?.() },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="enrollment-course">Curso</Label>
        <select
          id="enrollment-course"
          required
          value={courseSlug}
          onChange={(event) => pickCourse(event.target.value)}
          className={nativeSelect}
        >
          <option value="" disabled>
            Escolha o curso
          </option>
          {available.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="enrollment-curriculum">Estrutura curricular</Label>
        <select
          id="enrollment-curriculum"
          required
          disabled={!course}
          value={curriculumSlug}
          onChange={(event) => setCurriculumSlug(event.target.value)}
          className={nativeSelect}
        >
          {course?.curriculumStructures.map((item) => (
            <option key={item.slug} value={item.slug}>
              EC {item.period}
              {item.isCurrent ? ' (vigente)' : ''}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          A do seu histórico no SIGAA. Dá para migrar depois.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="enrollment-number">Matrícula</Label>
          <Input
            id="enrollment-number"
            required
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]{4,10}"
            title="Só os números, de 4 a 10 dígitos"
            placeholder="Ex.: 512345"
            value={registrationNumber}
            onChange={(event) =>
              setRegistrationNumber(event.target.value.replace(/\D/g, ''))
            }
            className="h-11 rounded-xl"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="enrollment-entry">Ingresso</Label>
          <select
            id="enrollment-entry"
            value={entryTerm}
            onChange={(event) => setEntryTerm(event.target.value)}
            className={nativeSelect}
          >
            <option value="">Não informar</option>
            {terms.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </div>
      </div>

      {create.error && (
        <p role="alert" className="text-sm text-destructive">
          {create.error.message}
        </p>
      )}

      <div className={cn('flex gap-2', onCancel ? 'justify-end' : '')}>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Salvando…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
