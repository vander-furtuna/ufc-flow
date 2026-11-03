'use client'

import type {
  InternalTarget,
  LinkKind,
  ManagedLinkPage,
  PostListItem,
} from '@ufc-flow/contracts'
import { UploadSimpleIcon, XIcon } from '@phosphor-icons/react'
import { useState, useTransition, type FormEvent } from 'react'
import { toast } from 'sonner'

import { nativeSelect } from '@/components/academic/native-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fileUrl, uploadFile } from '@/lib/files/upload'
import {
  INTERNAL_TARGETS,
  LINK_KINDS,
  validateLinkForm,
  type LinkFormState,
} from '@/lib/link-page/link-form'
import type { ParsedLinkInput } from '@ufc-flow/contracts'
import { cn } from '@/lib/utils'

import { LINK_ICONS } from './link-icons'

const KINDS = Object.keys(LINK_KINDS) as LinkKind[]

function Check({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-primary"
      />
      {label}
    </label>
  )
}

const errorText = (id: string, message?: string) =>
  message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null

// Criar ou editar um link (mockup Links-Editor, card expandido)
export function LinkForm({
  initial,
  courseId,
  sections,
  posts,
  isNew,
  onSave,
  onCancel,
  onRemove,
}: {
  initial: LinkFormState
  courseId: string
  sections: ManagedLinkPage['sections']
  posts: PostListItem[]
  isNew: boolean
  onSave: (input: ParsedLinkInput) => Promise<boolean>
  onCancel: () => void
  onRemove?: () => void
}) {
  const [state, setState] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState<'file' | 'thumb' | null>(null)
  const [isSaving, startSaving] = useTransition()
  const set = <K extends keyof LinkFormState>(
    key: K,
    value: LinkFormState[K],
  ) => setState((current) => ({ ...current, [key]: value }))

  const upload = async (files: FileList | null, target: 'file' | 'thumb') => {
    const file = files?.[0]
    if (!file) return
    setUploading(target)
    const result = await uploadFile(
      file,
      target === 'file' ? 'LINK_FILE' : 'LINK_THUMBNAIL',
      courseId,
    )
    setUploading(null)
    if (!result.ok) {
      toast.error(result.problem.detail)
      return
    }
    if (target === 'file') {
      setState((current) => ({
        ...current,
        fileId: result.data.id,
        label:
          current.label || result.data.originalName.replace(/\.[^.]+$/, ''),
      }))
    } else {
      set('thumbnailFileId', result.data.id)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const result = validateLinkForm(state)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    startSaving(async () => {
      await onSave(result.input)
    })
  }

  const field = (id: string, key: string) => ({
    id,
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `${id}-error` : undefined,
  })

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-4 rounded-2xl border-2 border-primary/70 bg-background p-4 sm:p-5"
    >
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Tipo de link</legend>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((kind) => (
            <label
              key={kind}
              className={cn(
                'flex h-10 cursor-pointer items-center rounded-full border px-4 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                state.kind === kind
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-muted',
              )}
            >
              <input
                type="radio"
                name="link-kind"
                className="sr-only"
                checked={state.kind === kind}
                onChange={() => set('kind', kind)}
              />
              {LINK_KINDS[kind]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="link-label">Título</Label>
          <Input
            {...field('link-label', 'label')}
            maxLength={80}
            value={state.label}
            onChange={(event) => set('label', event.target.value)}
          />
          {errorText('link-label-error', errors.label)}
        </div>

        <div className="flex flex-col gap-2">
          {state.kind === 'URL' && (
            <>
              <Label htmlFor="link-url">Link</Label>
              <Input
                {...field('link-url', 'url')}
                type="url"
                inputMode="url"
                spellCheck={false}
                placeholder="https://…"
                className="font-mono"
                value={state.url}
                onChange={(event) => set('url', event.target.value)}
              />
              {errorText('link-url-error', errors.url)}
            </>
          )}
          {state.kind === 'INTERNAL' && (
            <>
              <Label htmlFor="link-internal">Tela do Flow</Label>
              <select
                {...field('link-internal', 'internalTarget')}
                value={state.internalTarget ?? ''}
                onChange={(event) =>
                  set(
                    'internalTarget',
                    (event.target.value || null) as InternalTarget | null,
                  )
                }
                className={nativeSelect}
              >
                <option value="">Escolha a tela</option>
                {Object.entries(INTERNAL_TARGETS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errorText('link-internal-error', errors.internalTarget)}
            </>
          )}
          {state.kind === 'POST' && (
            <>
              <Label htmlFor="link-post">Post do hub</Label>
              <select
                {...field('link-post', 'postId')}
                value={state.postId ?? ''}
                onChange={(event) => {
                  const post = posts.find(
                    (item) => item.id === event.target.value,
                  )
                  setState((current) => ({
                    ...current,
                    postId: post?.id ?? null,
                    label: current.label || (post?.title.slice(0, 80) ?? ''),
                  }))
                }}
                className={nativeSelect}
              >
                <option value="">Escolha o post</option>
                {posts.map((post) => (
                  <option key={post.id} value={post.id}>
                    {post.title}
                  </option>
                ))}
              </select>
              {errorText('link-post-error', errors.postId)}
            </>
          )}
          {state.kind === 'FILE' && (
            <>
              <span className="text-sm font-medium">Arquivo</span>
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 text-sm hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
                <UploadSimpleIcon aria-hidden className="size-4" />
                {uploading === 'file'
                  ? 'Enviando…'
                  : state.fileId
                    ? 'Arquivo enviado · trocar'
                    : 'Enviar PDF ou imagem'}
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="sr-only"
                  aria-describedby={
                    errors.fileId ? 'link-file-error' : undefined
                  }
                  disabled={uploading !== null}
                  onChange={(event) => {
                    void upload(event.target.files, 'file')
                    event.target.value = ''
                  }}
                />
              </label>
              {errorText('link-file-error', errors.fileId)}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="link-description">Descrição curta (opcional)</Label>
          <Input
            id="link-description"
            maxLength={120}
            value={state.description}
            onChange={(event) => set('description', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="link-section">Seção</Label>
          <select
            id="link-section"
            value={state.sectionId ?? ''}
            onChange={(event) => set('sectionId', event.target.value || null)}
            className={nativeSelect}
          >
            <option value="">Sem seção (no topo)</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Imagem do link</legend>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(LINK_ICONS).map(([name, { label, Icon }]) => (
            <button
              key={name}
              type="button"
              aria-pressed={state.icon === name}
              aria-label={`Ícone: ${label}`}
              onClick={() => set('icon', state.icon === name ? null : name)}
              className={cn(
                'flex size-11 items-center justify-center rounded-xl border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                state.icon === name
                  ? 'border-2 border-primary bg-muted'
                  : 'hover:bg-muted',
              )}
            >
              <Icon aria-hidden className="size-5" />
            </button>
          ))}
          {state.thumbnailFileId ? (
            <span className="relative">
              <img
                src={fileUrl(state.thumbnailFileId)}
                alt="Miniatura escolhida"
                width={44}
                height={44}
                className="size-11 rounded-xl border object-cover"
              />
              <button
                type="button"
                aria-label="Remover a miniatura"
                onClick={() => set('thumbnailFileId', null)}
                className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ) : (
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 text-sm font-medium hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
              <UploadSimpleIcon aria-hidden className="size-4" />
              {uploading === 'thumb' ? 'Enviando…' : 'Enviar miniatura'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploading !== null}
                onChange={(event) => {
                  void upload(event.target.files, 'thumb')
                  event.target.value = ''
                }}
              />
            </label>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          A miniatura tem prioridade sobre o ícone.
        </p>
      </fieldset>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Check
          label="Destacar com brilho"
          checked={state.isFeatured}
          onChange={(value) => set('isFeatured', value)}
        />
        <Check
          label="Selo “Novo”"
          checked={state.isNew}
          onChange={(value) => set('isNew', value)}
        />
        <Check
          label="Abrir na mesma aba"
          checked={state.openInSameTab}
          onChange={(value) => set('openInSameTab', value)}
        />
        <Check
          label="Visível"
          checked={state.isVisible}
          onChange={(value) => set('isVisible', value)}
        />
      </div>

      <fieldset className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-muted p-3 text-sm">
        <legend className="sr-only">Período</legend>
        <label htmlFor="link-from">Mostrar de</label>
        <Input
          id="link-from"
          type="date"
          className="w-auto"
          value={state.visibleFrom}
          onChange={(event) => set('visibleFrom', event.target.value)}
        />
        <label htmlFor="link-until">até</label>
        <Input
          {...field('link-until', 'visibleUntil')}
          type="date"
          className="w-auto"
          value={state.visibleUntil}
          onChange={(event) => set('visibleUntil', event.target.value)}
        />
        <span className="text-muted-foreground">
          Depois disso o link some sozinho.
        </span>
        <div className="basis-full">
          {errorText('link-until-error', errors.visibleUntil)}
        </div>
      </fieldset>

      {state.isFeatured && (
        <p className="text-xs text-muted-foreground">
          Só um link fica em destaque: marcar este tira o destaque do outro.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            Remover link
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={isSaving}
            disabled={uploading !== null}
          >
            {isNew ? 'Adicionar link' : 'Salvar link'}
          </Button>
        </div>
      </div>
    </form>
  )
}
