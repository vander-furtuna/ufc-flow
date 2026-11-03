'use client'

import {
  LINK_PAGE_THEMES,
  type LinkButtonShape,
  type LinkButtonStyle,
  type LinkPageTheme,
  type LinkTitleFont,
  type ParsedLinkPageSettings,
} from '@ufc-flow/contracts'
import { UploadSimpleIcon, WarningIcon } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import {
  COURSE_ICON_NAMES,
  CourseDynamicIcon,
} from '@/components/course-dynamic-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fileUrl, uploadFile } from '@/lib/files/upload'
import { cn } from '@/lib/utils'

export type Settings = ParsedLinkPageSettings

const THEMES: [LinkPageTheme, string][] = [
  ['CIANO', 'Ciano'],
  ['LARANJA', 'Laranja'],
  ['VERDE', 'Verde'],
  ['VIOLETA', 'Violeta'],
  ['BRANCO', 'Branco'],
  ['ESCURO', 'Escuro'],
]
const STYLES: [LinkButtonStyle, string][] = [
  ['FILLED', 'Preenchido'],
  ['OUTLINE', 'Contorno'],
  ['SOFT', 'Suave'],
]
const SHAPES: [LinkButtonShape, string, string][] = [
  ['SQUARE', 'Reto', 'rounded-[3px]'],
  ['ROUNDED', 'Arredondado', 'rounded-lg'],
  ['PILL', 'Pílula', 'rounded-full'],
]
const FONTS: [LinkTitleFont, string, string][] = [
  ['CLASH', 'Clash Display', 'font-clash'],
  ['GEIST', 'Geist', 'font-sans'],
]

const option = (on: boolean) =>
  cn(
    'flex items-center justify-center rounded-xl bg-background text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
    on ? 'border-2 border-primary' : 'border hover:bg-muted',
  )

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-background p-4 sm:p-5">
      <h2 className="font-clash text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

// Aba Aparência (mockups Links-Editor e Mobile-Links-Editor). As mudanças
// aparecem na pré-visualização na hora; vão para a API ao salvar.
export function AppearanceTab({
  draft,
  saved,
  courseId,
  onChange,
  onSave,
  isSaving,
  preview,
}: {
  draft: Settings
  saved: Settings
  courseId: string
  onChange: (draft: Settings) => void
  onSave: () => void
  isSaving: boolean
  // Pré-visualização no topo, só no celular
  preview: ReactNode
}) {
  const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null)
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...draft, [key]: value })
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  const upload = async (files: FileList | null, target: 'avatar' | 'cover') => {
    const file = files?.[0]
    if (!file) return
    setUploading(target)
    const result = await uploadFile(file, 'LINK_PAGE_IMAGE', courseId)
    setUploading(null)
    if (!result.ok) {
      toast.error(result.problem.detail)
      return
    }
    set(target === 'avatar' ? 'avatarFileId' : 'coverFileId', result.data.id)
  }

  const fileButton = (target: 'avatar' | 'cover', label: string) => (
    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-medium hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
      <UploadSimpleIcon aria-hidden className="size-4" />
      {uploading === target ? 'Enviando…' : label}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={uploading !== null}
        onChange={(event) => {
          void upload(event.target.files, target)
          event.target.value = ''
        }}
      />
    </label>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="lg:hidden">{preview}</div>

      <Group title="Publicação">
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={draft.isPublished}
            onChange={(event) => set('isPublished', event.target.checked)}
            className="size-4 accent-primary"
          />
          Página publicada
          <span className="text-muted-foreground">
            (despublicada, o endereço responde “não encontrada”)
          </span>
        </label>
        <div className="flex flex-col gap-2">
          <Label htmlFor="page-slug">Endereço</Label>
          <div className="flex items-center rounded-md border focus-within:ring-2 focus-within:ring-ring">
            <span className="pl-3 font-mono text-sm text-muted-foreground">
              /l/
            </span>
            <input
              id="page-slug"
              spellCheck={false}
              autoComplete="off"
              value={draft.slug}
              onChange={(event) =>
                set(
                  'slug',
                  event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                )
              }
              aria-describedby={
                draft.slug !== saved.slug ? 'page-slug-warning' : undefined
              }
              className="h-10 min-w-0 flex-1 bg-transparent px-1 font-mono text-sm outline-none"
            />
          </div>
          {draft.slug !== saved.slug && (
            <p
              id="page-slug-warning"
              className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400"
            >
              <WarningIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              Trocar o endereço quebra os QR codes e links já divulgados.
            </p>
          )}
        </div>
      </Group>

      <Group title="Perfil">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Ícone ou foto</span>
          <div className="flex flex-wrap items-center gap-2">
            {COURSE_ICON_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                aria-label={`Ícone ${name}`}
                aria-pressed={!draft.avatarFileId && draft.avatarIcon === name}
                onClick={() =>
                  onChange({ ...draft, avatarIcon: name, avatarFileId: null })
                }
                className={cn(
                  option(!draft.avatarFileId && draft.avatarIcon === name),
                  'size-11',
                )}
              >
                <CourseDynamicIcon name={name} aria-hidden className="size-5" />
              </button>
            ))}
            {draft.avatarFileId && (
              <img
                src={fileUrl(draft.avatarFileId)}
                alt="Foto escolhida"
                width={44}
                height={44}
                className="size-11 rounded-xl border-2 border-primary object-cover"
              />
            )}
            {fileButton('avatar', 'Enviar foto')}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Capa</span>
          {fileButton(
            'cover',
            draft.coverFileId ? 'Trocar capa' : 'Enviar imagem de capa',
          )}
          {draft.coverFileId && (
            <Button
              type="button"
              variant="ghost"
              className="h-10"
              onClick={() => set('coverFileId', null)}
            >
              Remover capa
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="page-bio">Bio</Label>
          <Input
            id="page-bio"
            maxLength={160}
            value={draft.bio ?? ''}
            onChange={(event) => set('bio', event.target.value || null)}
          />
        </div>
      </Group>

      <Group title="Tema">
        <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-6 sm:px-0">
          {THEMES.map(([theme, label]) => {
            const tokens = LINK_PAGE_THEMES[theme]
            const on = draft.theme === theme
            return (
              <button
                key={theme}
                type="button"
                aria-pressed={on}
                onClick={() => set('theme', theme)}
                className={cn(
                  option(on),
                  'w-20 shrink-0 flex-col gap-2 py-3 sm:w-auto',
                )}
              >
                <span
                  aria-hidden
                  className="size-10 rounded-full border-[3px]"
                  style={{
                    background: tokens.background,
                    borderColor: tokens.accent,
                  }}
                />
                {label}
              </button>
            )
          })}
        </div>
      </Group>

      <Group title="Botões">
        <fieldset className="grid min-w-0 grid-cols-3 gap-2">
          <legend className="sr-only">Estilo</legend>
          {STYLES.map(([style, label]) => (
            <button
              key={style}
              type="button"
              aria-pressed={draft.buttonStyle === style}
              onClick={() => set('buttonStyle', style)}
              className={cn(
                option(draft.buttonStyle === style),
                'h-16 flex-col gap-2',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'h-3 w-14 rounded-md',
                  style === 'FILLED' && 'bg-foreground',
                  style === 'OUTLINE' && 'border-2 border-foreground',
                  style === 'SOFT' && 'border bg-muted',
                )}
              />
              {label}
            </button>
          ))}
        </fieldset>
        <fieldset className="grid min-w-0 grid-cols-3 gap-2">
          <legend className="sr-only">Formato</legend>
          {SHAPES.map(([shape, label, radius]) => (
            <button
              key={shape}
              type="button"
              aria-pressed={draft.buttonShape === shape}
              onClick={() => set('buttonShape', shape)}
              className={cn(
                option(draft.buttonShape === shape),
                'h-16 flex-col gap-2',
              )}
            >
              <span
                aria-hidden
                className={cn('h-3 w-14 border-2 border-foreground', radius)}
              />
              {label}
            </button>
          ))}
        </fieldset>
      </Group>

      <Group title="Fonte do título">
        <div className="grid grid-cols-2 gap-2">
          {FONTS.map(([font, label, family]) => (
            <button
              key={font}
              type="button"
              aria-pressed={draft.titleFont === font}
              onClick={() => set('titleFont', font)}
              className={cn(
                option(draft.titleFont === font),
                'h-14 text-lg font-semibold',
                family,
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Group>

      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-2xl border bg-background/90 p-3 backdrop-blur">
        <span
          className="mr-auto text-xs text-muted-foreground sm:text-sm"
          aria-live="polite"
        >
          {dirty ? 'Não salvo' : 'Tudo salvo'}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={!dirty || isSaving}
          onClick={() => onChange(saved)}
        >
          Descartar
        </Button>
        <Button
          type="button"
          disabled={!dirty}
          isLoading={isSaving}
          onClick={onSave}
        >
          Salvar aparência
        </Button>
      </div>
    </div>
  )
}
