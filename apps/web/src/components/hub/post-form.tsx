'use client'

import type { PostStatus, PostType } from '@ufc-flow/contracts'
import { ImageSquareIcon, XIcon } from '@phosphor-icons/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition, type FormEvent } from 'react'
import { toast } from 'sonner'

import { nativeSelect } from '@/components/academic/native-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  POST_STATUS_LABELS,
  POST_TYPE_ORDER,
  POST_TYPES,
} from '@/data/post-types'
import { fileUrl, uploadFile } from '@/lib/files/upload'
import { createPostAction, updatePostAction } from '@/lib/hub/hub-actions'
import {
  ATTRIBUTE_FIELDS,
  validatePostForm,
  type PostFormErrors,
  type PostFormState,
} from '@/lib/hub/post-form'
import { useInvalidateHub } from '@/lib/hub/use-hub'
import { cn } from '@/lib/utils'

import { PostMarkdown } from './post-markdown'

const MAX_IMAGES = 10
const STATUSES: PostStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED']
const MODALITIES = [
  ['IN_PERSON', 'Presencial'],
  ['ONLINE', 'On-line'],
  ['HYBRID', 'Híbrido'],
] as const

const textarea =
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none md:text-sm'
const section =
  'flex min-w-0 flex-col gap-4 rounded-2xl border bg-background p-5'
const legend =
  'mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  )
}

// Campo com rótulo, erro ligado por aria-describedby e dica opcional
function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: (props: {
    id: string
    'aria-invalid'?: true
    'aria-describedby'?: string
  }) => React.ReactNode
}) {
  const described = [hint && `${id}-hint`, error && `${id}-error`]
    .filter(Boolean)
    .join(' ')
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        ...(error ? { 'aria-invalid': true as const } : {}),
        ...(described ? { 'aria-describedby': described } : {}),
      })}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}

export type PostFormProps = {
  course: { slug: string; id: string }
  // Edição: o id do post e se ele é institucional
  post?: { id: string; institutional: boolean }
  isAdmin: boolean
  initial: PostFormState
}

// Formulário de post do hub (moderação do curso e admin). Valida com o
// postInputSchema do contracts; a API confere de novo.
export function PostForm({ course, post, isAdmin, initial }: PostFormProps) {
  const [state, setState] = useState(initial)
  const [errors, setErrors] = useState<PostFormErrors>({})
  const [problem, setProblem] = useState<string | null>(null)
  const [institutional, setInstitutional] = useState(
    post?.institutional ?? false,
  )
  const [preview, setPreview] = useState(false)
  const [uploading, setUploading] = useState<'cover' | 'gallery' | null>(null)
  const [isSaving, startSaving] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const invalidate = useInvalidateHub()

  const set = <K extends keyof PostFormState>(
    key: K,
    value: PostFormState[K],
  ) => setState((current) => ({ ...current, [key]: value }))
  const setAttribute = (key: string, value: string) =>
    setState((current) => ({
      ...current,
      attributes: { ...current.attributes, [key]: value },
    }))

  const hubHref = `/${course.slug}/hub`
  const type = state.type

  const upload = async (
    files: FileList | null,
    target: 'cover' | 'gallery',
  ) => {
    const chosen = Array.from(files ?? [])
    if (chosen.length === 0) return
    setUploading(target)
    // O institucional não tem curso (D82)
    const courseId = institutional ? undefined : course.id
    try {
      if (target === 'cover') {
        const result = await uploadFile(chosen[0]!, 'POST_COVER', courseId)
        if (result.ok) set('coverFileId', result.data.id)
        else toast.error(result.problem.detail)
        return
      }
      const room = MAX_IMAGES - state.imageFileIds.length
      const ids: string[] = []
      for (const file of chosen.slice(0, room)) {
        const result = await uploadFile(file, 'POST_IMAGE', courseId)
        if (result.ok) ids.push(result.data.id)
        else toast.error(result.problem.detail)
      }
      if (chosen.length > room) {
        toast.error(`A galeria aceita até ${MAX_IMAGES} imagens`)
      }
      setState((current) => ({
        ...current,
        imageFileIds: [...current.imageFileIds, ...ids],
      }))
    } finally {
      setUploading(null)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setProblem(null)
    const result = validatePostForm(state)
    if (!result.ok) {
      setErrors(result.errors)
      // Leva o foco ao primeiro campo com erro
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      )
      return
    }
    setErrors({})
    startSaving(async () => {
      const saved = post
        ? await updatePostAction(post.id, result.input)
        : await createPostAction(
            institutional ? null : course.slug,
            result.input,
          )
      if (!saved.ok) {
        setProblem(saved.problem.detail ?? 'Não foi possível salvar o post')
        return
      }
      await invalidate()
      toast.success(post ? 'Post salvo' : 'Post criado')
      router.push(`${hubHref}/${saved.data.slug}`)
      router.refresh()
    })
  }

  const dateField = (
    key: 'startsAt' | 'endsAt' | 'deadlineAt',
    label: string,
    required = false,
  ) => (
    <Field id={`post-${key}`} label={label} error={errors[key]}>
      {(props) => (
        <Input
          {...props}
          type="datetime-local"
          required={required}
          value={state[key]}
          onChange={(event) => set(key, event.target.value)}
        />
      )}
    </Field>
  )

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-5"
    >
      <fieldset className={section}>
        <legend className={cn(legend, 'float-left')}>Tipo</legend>
        <div className="clear-both flex flex-wrap gap-2">
          {POST_TYPE_ORDER.map((value) => (
            <label
              key={value}
              className={cn(
                'flex h-10 cursor-pointer items-center rounded-full border px-4 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                type === value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted',
              )}
            >
              <input
                type="radio"
                name="post-type"
                value={value}
                checked={type === value}
                onChange={() => set('type', value as PostType)}
                className="sr-only"
              />
              {POST_TYPES[value].label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={section}>
        <legend className={cn(legend, 'float-left')}>Conteúdo</legend>
        <div className="clear-both flex flex-col gap-4">
          <Field
            id="post-title"
            label="Título"
            error={errors.title}
            hint={`${state.title.length}/140`}
          >
            {(props) => (
              <Input
                {...props}
                required
                maxLength={140}
                value={state.title}
                onChange={(event) => set('title', event.target.value)}
              />
            )}
          </Field>
          <Field
            id="post-summary"
            label="Resumo (opcional)"
            error={errors.summary}
            hint="Aparece no card do hub. Até 280 caracteres."
          >
            {(props) => (
              <textarea
                {...props}
                rows={2}
                maxLength={280}
                value={state.summary}
                onChange={(event) => set('summary', event.target.value)}
                className={textarea}
              />
            )}
          </Field>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="post-body">Texto</Label>
              <div className="flex gap-1 rounded-xl border bg-muted p-1">
                {[false, true].map((value) => (
                  <button
                    key={String(value)}
                    type="button"
                    aria-pressed={preview === value}
                    onClick={() => setPreview(value)}
                    className={cn(
                      'h-8 rounded-lg px-3 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      preview === value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground',
                    )}
                  >
                    {value ? 'Pré-visualizar' : 'Escrever'}
                  </button>
                ))}
              </div>
            </div>
            {preview ? (
              <div className="min-h-48 rounded-md border p-4">
                {state.bodyMd.trim() ? (
                  <PostMarkdown>{state.bodyMd}</PostMarkdown>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nada escrito ainda.
                  </p>
                )}
              </div>
            ) : (
              <textarea
                id="post-body"
                rows={10}
                value={state.bodyMd}
                onChange={(event) => set('bodyMd', event.target.value)}
                aria-invalid={errors.bodyMd ? true : undefined}
                aria-describedby={
                  errors.bodyMd
                    ? 'post-body-hint post-body-error'
                    : 'post-body-hint'
                }
                className={cn(textarea, 'font-mono')}
              />
            )}
            <p id="post-body-hint" className="text-xs text-muted-foreground">
              Markdown: **negrito**, _itálico_, [link](https://…), listas com -,
              ## títulos e &gt; citações. Imagens vão na galeria.
            </p>
            <FieldError id="post-body-error" message={errors.bodyMd} />
          </div>
        </div>
      </fieldset>

      <fieldset className={section}>
        <legend className={cn(legend, 'float-left')}>Datas e detalhes</legend>
        <div className="clear-both grid gap-4 sm:grid-cols-2">
          {type === 'EVENT' && (
            <>
              {dateField('startsAt', 'Início', true)}
              {dateField('endsAt', 'Término (opcional)')}
            </>
          )}
          {(type === 'SCHOLARSHIP' || type === 'CALL') &&
            dateField('deadlineAt', 'Prazo', true)}
          {type !== 'SCHOLARSHIP' && type !== 'CALL' && (
            <Field
              id="post-location"
              label="Local (opcional)"
              error={errors.location}
            >
              {(props) => (
                <Input
                  {...props}
                  maxLength={120}
                  value={state.location}
                  onChange={(event) => set('location', event.target.value)}
                />
              )}
            </Field>
          )}
          {ATTRIBUTE_FIELDS[type].map((field) => {
            const id = `post-attr-${field.key}`
            const error = errors[`attributes.${field.key}`]
            const value = state.attributes[field.key] ?? ''
            return (
              <Field
                key={field.key}
                id={id}
                label={`${field.label} (opcional)`}
                error={error}
              >
                {(props) =>
                  field.kind === 'modality' ? (
                    <select
                      {...props}
                      value={value}
                      onChange={(event) =>
                        setAttribute(field.key, event.target.value)
                      }
                      className={nativeSelect}
                    >
                      <option value="">Não informar</option>
                      {MODALITIES.map(([option, label]) => (
                        <option key={option} value={option}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      {...props}
                      type={field.kind === 'url' ? 'url' : 'text'}
                      inputMode={
                        field.kind === 'int'
                          ? 'numeric'
                          : field.kind === 'money'
                            ? 'decimal'
                            : undefined
                      }
                      placeholder={
                        field.kind === 'url' ? 'https://…' : undefined
                      }
                      value={value}
                      onChange={(event) =>
                        setAttribute(field.key, event.target.value)
                      }
                    />
                  )
                }
              </Field>
            )
          })}
          <div className="sm:col-span-2">
            <Field
              id="post-external"
              label="Link externo (opcional)"
              error={errors.externalUrl}
              hint="Vira o botão “Acessar o link” na página do post."
            >
              {(props) => (
                <Input
                  {...props}
                  type="url"
                  placeholder="https://…"
                  value={state.externalUrl}
                  onChange={(event) => set('externalUrl', event.target.value)}
                />
              )}
            </Field>
          </div>
        </div>
      </fieldset>

      <fieldset className={section}>
        <legend className={cn(legend, 'float-left')}>Imagens</legend>
        <div className="clear-both flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Capa (opcional)</span>
            {state.coverFileId ? (
              <div className="relative w-full max-w-sm">
                <img
                  src={fileUrl(state.coverFileId)}
                  alt="Capa escolhida"
                  width={384}
                  height={216}
                  className="aspect-video w-full rounded-xl border object-cover"
                />
                <button
                  type="button"
                  onClick={() => set('coverFileId', null)}
                  aria-label="Remover a capa"
                  className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-background/90 shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            ) : (
              <label className="flex h-24 w-full max-w-sm cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-sm text-muted-foreground hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
                <ImageSquareIcon aria-hidden className="size-6" />
                {uploading === 'cover' ? 'Enviando…' : 'Escolher imagem'}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploading !== null}
                  onChange={(event) => {
                    void upload(event.target.files, 'cover')
                    event.target.value = ''
                  }}
                />
              </label>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">
              Galeria ({state.imageFileIds.length}/{MAX_IMAGES})
            </span>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {state.imageFileIds.map((id, index) => (
                <li key={id} className="relative">
                  <img
                    src={fileUrl(id)}
                    alt={`Imagem ${index + 1} da galeria`}
                    width={160}
                    height={160}
                    className="aspect-square w-full rounded-lg border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        'imageFileIds',
                        state.imageFileIds.filter((item) => item !== id),
                      )
                    }
                    aria-label={`Remover a imagem ${index + 1}`}
                    className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-background/90 shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </li>
              ))}
              {state.imageFileIds.length < MAX_IMAGES && (
                <li>
                  <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center text-xs text-muted-foreground hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
                    <ImageSquareIcon aria-hidden className="size-5" />
                    {uploading === 'gallery' ? 'Enviando…' : 'Adicionar'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      disabled={uploading !== null}
                      onChange={(event) => {
                        void upload(event.target.files, 'gallery')
                        event.target.value = ''
                      }}
                    />
                  </label>
                </li>
              )}
            </ul>
            <FieldError id="post-images-error" message={errors.imageFileIds} />
          </div>
        </div>
      </fieldset>

      <fieldset className={section}>
        <legend className={cn(legend, 'float-left')}>Publicação</legend>
        <div className="clear-both flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="post-status">Situação</Label>
            <select
              id="post-status"
              value={state.status}
              onChange={(event) =>
                set('status', event.target.value as PostStatus)
              }
              className={cn(nativeSelect, 'sm:max-w-xs')}
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {POST_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Rascunho e arquivado só aparecem para a moderação.
            </p>
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={state.pinned}
              onChange={(event) => set('pinned', event.target.checked)}
              className="size-4 accent-primary"
            />
            Fixar no topo do hub
          </label>
          {isAdmin && !post && (
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={institutional}
                onChange={(event) => {
                  setInstitutional(event.target.checked)
                  // As imagens enviadas para o curso não servem ao institucional
                  setState((current) => ({
                    ...current,
                    coverFileId: null,
                    imageFileIds: [],
                  }))
                }}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                Institucional
                <span className="block text-xs text-muted-foreground">
                  Aparece no hub de todos os cursos.
                </span>
              </span>
            </label>
          )}
        </div>
      </fieldset>

      {problem && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {problem}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={hubHref}>Cancelar</Link>
        </Button>
        <Button
          type="submit"
          isLoading={isSaving}
          disabled={uploading !== null}
        >
          {post ? 'Salvar post' : 'Criar post'}
        </Button>
      </div>
    </form>
  )
}
