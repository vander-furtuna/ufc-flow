'use client'

import { FileTextIcon } from '@phosphor-icons/react'
import type {
  ActivityCategoryView,
  ActivityRecordView,
} from '@ufc-flow/contracts'
import { useId, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSaveActivity } from '@/lib/academic-record/use-academic'
import { fileUrl, uploadFile } from '@/lib/files/upload'
import { cn } from '@/lib/utils'

import { nativeSelect } from './native-select'

type Kind = ActivityRecordView['kind']

export const ACTIVITY_KIND_LABELS: Record<Kind, string> = {
  COMPLEMENTARY: 'Complementar',
  EXTENSION: 'Extensão',
}

// Conferido também na API (CERTIFICATE: imagem ou PDF, até 10 MB)
const CERTIFICATE_MAX_BYTES = 10 * 1024 * 1024
const CERTIFICATE_TYPES =
  'image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf'

type Form = {
  kind: Kind
  categoryId: string
  title: string
  institution: string
  hours: string
  startedOn: string
  endedOn: string
  description: string
}

const fromActivity = (
  activity: ActivityRecordView | null,
  kind: Kind,
): Form => ({
  kind: activity?.kind ?? kind,
  categoryId: activity?.categoryId ?? '',
  title: activity?.title ?? '',
  institution: activity?.institution ?? '',
  hours: activity ? String(activity.hours) : '',
  startedOn: activity?.startedOn ?? '',
  endedOn: activity?.endedOn ?? '',
  description: activity?.description ?? '',
})

function ActivityForm({
  enrollmentId,
  categories,
  activity,
  defaultKind,
  onDone,
  onCancel,
}: {
  enrollmentId: string
  categories: readonly ActivityCategoryView[]
  activity: ActivityRecordView | null
  defaultKind: Kind
  onDone: () => void
  onCancel: () => void
}) {
  const ids = useId()
  const [form, setForm] = useState(() => fromActivity(activity, defaultKind))
  const [certificateId, setCertificateId] = useState(
    activity?.certificateFileId ?? null,
  )
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const save = useSaveActivity()
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const options = categories.filter((category) => category.kind === form.kind)

  const pickFile = (picked: File | undefined) => {
    setError(null)
    if (!picked) return
    if (picked.size > CERTIFICATE_MAX_BYTES) {
      setError('O certificado pode ter até 10 MB.')
      return
    }
    setFile(picked)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    let certificateFileId = certificateId
    if (file) {
      setUploading(true)
      const uploaded = await uploadFile(file, 'CERTIFICATE')
      setUploading(false)
      if (!uploaded.ok) {
        setError(
          uploaded.problem.detail ?? 'Não foi possível enviar o arquivo.',
        )
        return
      }
      certificateFileId = uploaded.data.id
    }
    save.mutate(
      {
        target: activity ? { activityId: activity.id } : { enrollmentId },
        activity: {
          kind: form.kind,
          categoryId: form.categoryId || null,
          title: form.title,
          institution: form.institution,
          description: form.description,
          hours: Number(form.hours),
          startedOn: form.startedOn,
          endedOn: form.endedOn || null,
          certificateFileId,
        },
      },
      {
        onSuccess: () => {
          toast.success(activity ? 'Atividade salva.' : 'Atividade lançada.')
          onDone()
        },
        onError: (failure) => setError(failure.message),
      },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Tipo</legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(ACTIVITY_KIND_LABELS) as Kind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={form.kind === kind}
              onClick={() => {
                set('kind', kind)
                set('categoryId', '')
              }}
              className={cn(
                'h-11 rounded-xl border text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                form.kind === kind
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              {ACTIVITY_KIND_LABELS[kind]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${ids}-title`}>Título</Label>
        <Input
          id={`${ids}-title`}
          required
          minLength={2}
          maxLength={120}
          placeholder="Ex.: Monitoria de Cálculo I"
          value={form.title}
          onChange={(event) => set('title', event.target.value)}
          className="h-11 rounded-xl"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${ids}-category`}>Categoria</Label>
          <select
            id={`${ids}-category`}
            value={form.categoryId}
            onChange={(event) => set('categoryId', event.target.value)}
            className={nativeSelect}
          >
            <option value="">Sem categoria</option>
            {options.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.maxHours ? ` (até ${category.maxHours} h)` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${ids}-hours`}>Horas</Label>
          <Input
            id={`${ids}-hours`}
            required
            type="number"
            min={1}
            max={2000}
            inputMode="numeric"
            value={form.hours}
            onChange={(event) => set('hours', event.target.value)}
            className="h-11 rounded-xl"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${ids}-institution`}>
          Instituição{' '}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id={`${ids}-institution`}
          maxLength={120}
          placeholder="Ex.: UFC, Campus de Sobral"
          value={form.institution}
          onChange={(event) => set('institution', event.target.value)}
          className="h-11 rounded-xl"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${ids}-start`}>Início</Label>
          <Input
            id={`${ids}-start`}
            required
            type="date"
            value={form.startedOn}
            onChange={(event) => set('startedOn', event.target.value)}
            className="h-11 rounded-xl"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${ids}-end`}>
            Fim{' '}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </Label>
          <Input
            id={`${ids}-end`}
            type="date"
            min={form.startedOn || undefined}
            value={form.endedOn}
            onChange={(event) => set('endedOn', event.target.value)}
            className="h-11 rounded-xl"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${ids}-description`}>
          Descrição{' '}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <textarea
          id={`${ids}-description`}
          maxLength={500}
          rows={3}
          value={form.description}
          onChange={(event) => set('description', event.target.value)}
          className="rounded-xl border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${ids}-certificate`}>
          Certificado{' '}
          <span className="font-normal text-muted-foreground">
            (imagem ou PDF, até 10 MB; só você vê)
          </span>
        </Label>
        {certificateId && !file && (
          <div className="flex items-center justify-between gap-2 rounded-xl border p-3 text-sm">
            <a
              href={fileUrl(certificateId)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 underline underline-offset-2"
            >
              <FileTextIcon className="size-4" />
              Ver certificado
            </a>
            <button
              type="button"
              onClick={() => setCertificateId(null)}
              className="text-xs text-destructive underline underline-offset-2"
            >
              Remover
            </button>
          </div>
        )}
        <Input
          id={`${ids}-certificate`}
          type="file"
          accept={CERTIFICATE_TYPES}
          onChange={(event) => pickFile(event.target.files?.[0])}
          className="h-11 rounded-xl pt-2.5"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={uploading || save.isPending}>
          {uploading
            ? 'Enviando certificado…'
            : save.isPending
              ? 'Salvando…'
              : activity
                ? 'Salvar atividade'
                : 'Lançar atividade'}
        </Button>
      </div>
    </form>
  )
}

export function ActivityDialog({
  open,
  onOpenChange,
  enrollmentId,
  categories,
  activity,
  defaultKind = 'COMPLEMENTARY',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  enrollmentId: string
  categories: readonly ActivityCategoryView[]
  activity: ActivityRecordView | null
  defaultKind?: Kind
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {activity ? 'Editar atividade' : 'Lançar atividade'}
          </DialogTitle>
          <DialogDescription>
            As horas são declaradas por você; a validação oficial é da
            coordenação.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ActivityForm
            // Reabre o formulário limpo para cada atividade
            key={activity?.id ?? 'new'}
            enrollmentId={enrollmentId}
            categories={categories}
            activity={activity}
            defaultKind={defaultKind}
            onDone={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
