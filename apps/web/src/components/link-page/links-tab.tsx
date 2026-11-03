'use client'

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type {
  ManagedLinkPage,
  ParsedLinkInput,
  PostListItem,
  SocialNetwork,
} from '@ufc-flow/contracts'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DotsSixVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useState, type FormEvent, type ReactNode } from 'react'

import { nativeSelect } from '@/components/academic/native-select'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { fileUrl } from '@/lib/files/upload'
import {
  emptyLinkForm,
  linkFormFromManaged,
  linkMeta,
  type LinkFormState,
} from '@/lib/link-page/link-form'
import { editorGroups, moveItem, orderInput } from '@/lib/link-page/link-tree'
import {
  removeLinkAction,
  removeSectionAction,
  removeSocialAction,
  saveLinkAction,
  saveOrderAction,
  saveSectionAction,
  saveSocialAction,
  type LinkPageResult,
} from '@/lib/link-page/link-page-actions'
import { cn } from '@/lib/utils'

import { LinkForm } from './link-form'
import { LinkIcon, SOCIAL_NETWORKS } from './link-icons'

type ManagedLink = ManagedLinkPage['links'][number]
export type Run = (
  action: () => Promise<LinkPageResult<ManagedLinkPage>>,
  success?: string,
) => Promise<boolean>

const groupLabel =
  'text-xs font-semibold tracking-wide text-muted-foreground uppercase'
const iconButton =
  'flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40'

function Confirm({
  open,
  title,
  description,
  action,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description: string
  action: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {action}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LinkRow({
  link,
  onEdit,
  dragHandle,
}: {
  link: ManagedLink
  onEdit: () => void
  dragHandle: ReactNode
}) {
  const muted = link.status !== 'ACTIVE'
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-2xl border bg-background py-2 pr-2 pl-1',
        muted && 'border-dashed',
        link.isFeatured && 'border-2 border-cyan-500',
      )}
    >
      {dragHandle}
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground"
      >
        {link.thumbnailFileId ? (
          <img
            src={fileUrl(link.thumbnailFileId)}
            alt=""
            width={40}
            height={40}
            className="size-full object-cover"
          />
        ) : (
          <LinkIcon icon={link.icon} className="size-5" />
        )}
      </span>
      <span
        className={cn('flex min-w-0 flex-1 flex-col', muted && 'opacity-70')}
      >
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{link.label}</span>
          {link.isFeatured && (
            <span className="shrink-0 rounded-full bg-cyan-50 px-2 text-[11px] font-semibold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">
              Destaque
            </span>
          )}
          {link.badge === 'NEW' && (
            <span className="shrink-0 rounded-full bg-orange-600 px-2 text-[11px] font-bold text-white">
              NOVO
            </span>
          )}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {linkMeta(link)}
        </span>
      </span>
      <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:inline">
        {link.clicks7d} {link.clicks7d === 1 ? 'clique' : 'cliques'} em 7 dias
      </span>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Editar ${link.label}`}
        className={iconButton}
      >
        <PencilSimpleIcon className="size-4" />
      </button>
    </div>
  )
}

function SortableLink({
  link,
  children,
}: {
  link: ManagedLink
  children: (handle: ReactNode) => ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-10 opacity-80')}
    >
      {children(
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Arrastar ${link.label} para reordenar`}
          className={cn(
            iconButton,
            'w-8 cursor-grab touch-none active:cursor-grabbing',
          )}
        >
          <DotsSixVerticalIcon className="size-5" />
        </button>,
      )}
    </li>
  )
}

function SectionTitleForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: string
  submitLabel: string
  onSubmit: (title: string) => Promise<boolean>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (title.trim()) await onSubmit(title.trim())
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="section-title">
        Nome da seção
      </label>
      <Input
        id="section-title"
        maxLength={60}
        placeholder="Ex.: Acadêmico…"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="h-10 w-full sm:w-64"
      />
      <Button type="submit" className="h-10">
        {submitLabel}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-10"
        onClick={onCancel}
      >
        Cancelar
      </Button>
    </form>
  )
}

function SocialForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (network: SocialNetwork, url: string) => Promise<boolean>
  onCancel: () => void
}) {
  const [network, setNetwork] = useState<SocialNetwork>('INSTAGRAM')
  const [url, setUrl] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (await onSubmit(network, url.trim())) setUrl('')
  }
  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-2xl border p-3 sm:flex-row sm:items-center"
    >
      <label className="sr-only" htmlFor="social-network">
        Rede
      </label>
      <select
        id="social-network"
        value={network}
        onChange={(event) => setNetwork(event.target.value as SocialNetwork)}
        className={cn(nativeSelect, 'h-10 sm:w-40')}
      >
        {Object.entries(SOCIAL_NETWORKS).map(([value, { label }]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="social-url">
        Endereço
      </label>
      <Input
        id="social-url"
        spellCheck={false}
        type={network === 'EMAIL' ? 'email' : 'url'}
        placeholder={SOCIAL_NETWORKS[network].placeholder}
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        className="h-10 flex-1"
      />
      <div className="flex gap-2">
        <Button type="submit" className="h-10">
          Adicionar
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}

type Editing =
  | { id: 'new'; initial: LinkFormState }
  | { id: string; initial: LinkFormState }
  | null

export function LinksTab({
  page,
  courseSlug,
  posts,
  run,
  setPage,
}: {
  page: ManagedLinkPage
  courseSlug: string
  posts: PostListItem[]
  run: Run
  setPage: (page: ManagedLinkPage) => void
}) {
  const [editing, setEditing] = useState<Editing>(null)
  const [adding, setAdding] = useState<'section' | 'social' | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{
    kind: 'link' | 'section'
    id: string
    label: string
  } | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const groups = editorGroups(page)
  const sections = groups.flatMap((group) =>
    group.section ? [group.section] : [],
  )

  // Ordem otimista: mostra já e salva em lote; se a API recusar, volta
  const saveOrder = (next: ManagedLinkPage) => {
    setPage(next)
    void run(() => saveOrderAction(courseSlug, orderInput(next)))
  }

  const reorderLinks = (sectionId: string | null, event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return
    const order = groups.flatMap((group) => {
      const ids = group.links.map((link) => link.id)
      return (group.section?.id ?? null) === sectionId
        ? moveItem(ids, String(event.active.id), String(event.over!.id))
        : ids
    })
    saveOrder({
      ...page,
      links: page.links.map((link) => ({
        ...link,
        position: order.indexOf(link.id),
      })),
    })
  }

  const swap = <T extends { id: string; position: number }>(
    items: T[],
    id: string,
    direction: -1 | 1,
  ): T[] => {
    const sorted = [...items].sort((a, b) => a.position - b.position)
    const index = sorted.findIndex((item) => item.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= sorted.length) return items
    ;[sorted[index], sorted[target]] = [sorted[target]!, sorted[index]!]
    return sorted.map((item, position) => ({ ...item, position }))
  }

  const saveLink = async (id: string | null, input: ParsedLinkInput) => {
    const ok = await run(
      () => saveLinkAction(courseSlug, id, input),
      id ? 'Link salvo' : 'Link adicionado',
    )
    if (ok) setEditing(null)
    return ok
  }

  const form = (id: string | null, initial: LinkFormState) => (
    <LinkForm
      key={id ?? 'new'}
      initial={initial}
      courseId={page.courseId}
      sections={sections}
      posts={posts}
      isNew={id === null}
      onSave={(input) => saveLink(id, input)}
      onCancel={() => setEditing(null)}
      onRemove={
        id
          ? () => setConfirm({ kind: 'link', id, label: initial.label })
          : undefined
      }
    />
  )

  const socials = [...page.socialLinks].sort((a, b) => a.position - b.position)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <Button
          className="h-10"
          onClick={() => setEditing({ id: 'new', initial: emptyLinkForm() })}
        >
          <PlusIcon aria-hidden className="size-4" />
          Link
        </Button>
        <Button
          variant="outline"
          className="h-10"
          onClick={() => setAdding('section')}
        >
          + Seção
        </Button>
        <Button
          variant="outline"
          className="h-10"
          onClick={() => setAdding('social')}
        >
          + Rede social
        </Button>
        <Button
          variant="outline"
          className="h-10"
          disabled={posts.length === 0}
          onClick={() =>
            setEditing({
              id: 'new',
              initial: emptyLinkForm({ kind: 'POST', icon: 'megaphone' }),
            })
          }
        >
          + Post do hub
        </Button>
      </div>

      {adding === 'section' && (
        <SectionTitleForm
          initial=""
          submitLabel="Criar seção"
          onCancel={() => setAdding(null)}
          onSubmit={async (title) => {
            const ok = await run(
              () => saveSectionAction(courseSlug, null, { title }),
              'Seção criada',
            )
            if (ok) setAdding(null)
            return ok
          }}
        />
      )}
      {editing?.id === 'new' && form(null, editing.initial)}

      {groups.map((group, index) => {
        const section = group.section
        const sectionId = section?.id ?? null
        if (!section && group.links.length === 0) return null
        return (
          <section
            key={sectionId ?? 'top'}
            aria-label={section ? `Seção ${section.title}` : 'Links sem seção'}
            className="flex flex-col gap-2"
          >
            {section ? (
              renaming === section.id ? (
                <SectionTitleForm
                  initial={section.title}
                  submitLabel="Salvar"
                  onCancel={() => setRenaming(null)}
                  onSubmit={async (title) => {
                    const ok = await run(() =>
                      saveSectionAction(courseSlug, section.id, {
                        title,
                        isVisible: section.isVisible,
                      }),
                    )
                    if (ok) setRenaming(null)
                    return ok
                  }}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-1">
                  <h3 className={cn(groupLabel, 'mr-auto')}>
                    {section.title}
                    <span className="font-normal normal-case">
                      {' '}
                      · {group.links.length}{' '}
                      {group.links.length === 1 ? 'link' : 'links'}
                      {section.isVisible ? '' : ' · oculta'}
                    </span>
                  </h3>
                  <button
                    type="button"
                    aria-label={`Subir a seção ${section.title}`}
                    disabled={index === 1}
                    className={iconButton}
                    onClick={() =>
                      saveOrder({
                        ...page,
                        sections: swap(page.sections, section.id, -1),
                      })
                    }
                  >
                    <ArrowUpIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Descer a seção ${section.title}`}
                    disabled={index === groups.length - 1}
                    className={iconButton}
                    onClick={() =>
                      saveOrder({
                        ...page,
                        sections: swap(page.sections, section.id, 1),
                      })
                    }
                  >
                    <ArrowDownIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${section.isVisible ? 'Ocultar' : 'Mostrar'} a seção ${section.title}`}
                    className={iconButton}
                    onClick={() =>
                      void run(() =>
                        saveSectionAction(courseSlug, section.id, {
                          title: section.title,
                          isVisible: !section.isVisible,
                        }),
                      )
                    }
                  >
                    {section.isVisible ? (
                      <EyeIcon className="size-4" />
                    ) : (
                      <EyeSlashIcon className="size-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={`Renomear a seção ${section.title}`}
                    className={iconButton}
                    onClick={() => setRenaming(section.id)}
                  >
                    <PencilSimpleIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remover a seção ${section.title}`}
                    className={iconButton}
                    onClick={() =>
                      setConfirm({
                        kind: 'section',
                        id: section.id,
                        label: section.title,
                      })
                    }
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              )
            ) : (
              <h3 className={groupLabel}>No topo</h3>
            )}
            {group.links.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                Nenhum link nesta seção. Escolha a seção ao criar ou editar um
                link.
              </p>
            ) : (
              <DndContext
                // id fixo: o gerado muda entre servidor e navegador
                id={`links-${sectionId ?? 'top'}`}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => reorderLinks(sectionId, event)}
                accessibility={{
                  screenReaderInstructions: {
                    draggable:
                      'Para mover, aperte espaço, use as setas e aperte espaço de novo. Esc cancela.',
                  },
                }}
              >
                <SortableContext
                  items={group.links.map((link) => link.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="flex flex-col gap-2">
                    {group.links.map((link) => (
                      <SortableLink key={link.id} link={link}>
                        {(handle) =>
                          editing?.id === link.id ? (
                            form(link.id, editing.initial)
                          ) : (
                            <LinkRow
                              link={link}
                              dragHandle={handle}
                              onEdit={() =>
                                setEditing({
                                  id: link.id,
                                  initial: linkFormFromManaged(link),
                                })
                              }
                            />
                          )
                        }
                      </SortableLink>
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </section>
        )
      })}

      {page.links.length === 0 && editing === null && (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          A página ainda não tem links. Comece por “Link”.
        </p>
      )}

      <section aria-labelledby="social-title" className="flex flex-col gap-2">
        <h3 id="social-title" className={groupLabel}>
          Redes do curso
        </h3>
        {adding === 'social' && (
          <SocialForm
            onCancel={() => setAdding(null)}
            onSubmit={async (network, url) => {
              const ok = await run(
                () => saveSocialAction(courseSlug, null, { network, url }),
                'Rede adicionada',
              )
              if (ok) setAdding(null)
              return ok
            }}
          />
        )}
        {socials.length === 0 && adding !== 'social' ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma rede. Elas aparecem como ícones abaixo da bio.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {socials.map((social, index) => {
              const { Icon, label } = SOCIAL_NETWORKS[social.network]
              return (
                <li
                  key={social.id}
                  className="flex items-center gap-2 rounded-2xl border bg-background py-1.5 pr-1.5 pl-3"
                >
                  <Icon aria-hidden className="size-5 shrink-0" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {social.url.replace(/^mailto:/, '')}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Subir ${label}`}
                    disabled={index === 0}
                    className={iconButton}
                    onClick={() =>
                      saveOrder({
                        ...page,
                        socialLinks: swap(page.socialLinks, social.id, -1),
                      })
                    }
                  >
                    <ArrowUpIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Descer ${label}`}
                    disabled={index === socials.length - 1}
                    className={iconButton}
                    onClick={() =>
                      saveOrder({
                        ...page,
                        socialLinks: swap(page.socialLinks, social.id, 1),
                      })
                    }
                  >
                    <ArrowDownIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remover ${label}`}
                    className={iconButton}
                    onClick={() =>
                      void run(
                        () => removeSocialAction(courseSlug, social.id),
                        'Rede removida',
                      )
                    }
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Confirm
        open={confirm !== null}
        title={
          confirm?.kind === 'section'
            ? `Remover a seção “${confirm.label}”?`
            : `Remover o link “${confirm?.label ?? ''}”?`
        }
        description={
          confirm?.kind === 'section'
            ? 'Os links dela continuam, no topo da página.'
            : 'Os cliques contados dele também saem das estatísticas.'
        }
        action="Remover"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          const target = confirm
          setConfirm(null)
          if (!target) return
          if (target.kind === 'section') {
            void run(
              () => removeSectionAction(courseSlug, target.id),
              'Seção removida',
            )
          } else {
            setEditing(null)
            void run(
              () => removeLinkAction(courseSlug, target.id),
              'Link removido',
            )
          }
        }}
      />
    </div>
  )
}
