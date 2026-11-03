import {
  linkInputSchema,
  type InternalTarget,
  type LinkKind,
  type LinkScheduleStatus,
  type ManagedLinkPage,
  type ParsedLinkInput,
} from '@ufc-flow/contracts'

type ManagedLink = ManagedLinkPage['links'][number]

export const LINK_KINDS: Record<LinkKind, string> = {
  URL: 'Endereço',
  FILE: 'Arquivo',
  INTERNAL: 'Tela do Flow',
  POST: 'Post do hub',
}

export const INTERNAL_TARGETS: Record<InternalTarget, string> = {
  GRADE: 'Grade',
  AGENDA: 'Simular agenda',
  HUB: 'Hub do curso',
  CALENDARIO: 'Calendário acadêmico',
  RU: 'Cardápio do RU',
}

export const LINK_STATUS: Record<LinkScheduleStatus, string | null> = {
  ACTIVE: null,
  HIDDEN: 'Oculto',
  SCHEDULED: 'Programado',
  EXPIRED: 'Expirado',
}

// Estado do formulário de link, em texto; o período é por dia (Fortaleza)
export type LinkFormState = {
  kind: LinkKind
  label: string
  description: string
  sectionId: string | null
  url: string
  fileId: string | null
  internalTarget: InternalTarget | null
  postId: string | null
  icon: string | null
  thumbnailFileId: string | null
  isFeatured: boolean
  isNew: boolean
  openInSameTab: boolean
  isVisible: boolean
  visibleFrom: string
  visibleUntil: string
}

const OFFSET_MS = 3 * 60 * 60 * 1000

// Início no começo do dia e fim no último segundo, no horário de Fortaleza
export function fromDayInput(
  day: string,
  edge: 'start' | 'end',
): string | null {
  if (!day) return null
  const time = edge === 'start' ? '00:00:00' : '23:59:59'
  const date = new Date(`${day}T${time}-03:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function toDayInput(instant: string | null): string {
  if (!instant) return ''
  return new Date(new Date(instant).getTime() - OFFSET_MS)
    .toISOString()
    .slice(0, 10)
}

export function emptyLinkForm(
  overrides: Partial<LinkFormState> = {},
): LinkFormState {
  return {
    kind: 'URL',
    label: '',
    description: '',
    sectionId: null,
    url: '',
    fileId: null,
    internalTarget: null,
    postId: null,
    icon: null,
    thumbnailFileId: null,
    isFeatured: false,
    isNew: false,
    openInSameTab: false,
    isVisible: true,
    visibleFrom: '',
    visibleUntil: '',
    ...overrides,
  }
}

export function linkFormFromManaged(link: ManagedLink): LinkFormState {
  return {
    kind: link.kind,
    label: link.label,
    description: link.description ?? '',
    sectionId: link.sectionId,
    url: link.url ?? '',
    fileId: link.fileId,
    internalTarget: link.internalTarget,
    postId: link.postId,
    icon: link.icon,
    thumbnailFileId: link.thumbnailFileId,
    isFeatured: link.isFeatured,
    isNew: link.badge === 'NEW',
    openInSameTab: link.openInSameTab,
    isVisible: link.isVisible,
    visibleFrom: toDayInput(link.visibleFrom),
    visibleUntil: toDayInput(link.visibleUntil),
  }
}

export type LinkFormResult =
  | { ok: true; input: ParsedLinkInput }
  | { ok: false; errors: Record<string, string> }

// Manda só o destino do tipo escolhido; o linkInputSchema confere o resto
export function validateLinkForm(state: LinkFormState): LinkFormResult {
  const kind = state.kind
  const parsed = linkInputSchema.safeParse({
    kind,
    label: state.label,
    description: state.description,
    sectionId: state.sectionId,
    url: kind === 'URL' ? state.url.trim() || null : null,
    fileId: kind === 'FILE' ? state.fileId : null,
    internalTarget: kind === 'INTERNAL' ? state.internalTarget : null,
    postId: kind === 'POST' ? state.postId : null,
    icon: state.icon ?? '',
    thumbnailFileId: state.thumbnailFileId,
    isFeatured: state.isFeatured,
    badge: state.isNew ? 'NEW' : 'NONE',
    openInSameTab: state.openInSameTab,
    isVisible: state.isVisible,
    visibleFrom: fromDayInput(state.visibleFrom, 'start'),
    visibleUntil: fromDayInput(state.visibleUntil, 'end'),
  })
  if (parsed.success) return { ok: true, input: parsed.data }
  const errors: Record<string, string> = {}
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? 'form')
    errors[field] ??=
      issue.code === 'custom' || field === 'label'
        ? issue.message
        : field === 'url'
          ? 'Use um endereço http ou https'
          : 'Confira este campo'
  }
  return { ok: false, errors }
}

const host = (url: string | null) => {
  try {
    return url ? new URL(url).host : ''
  } catch {
    return url ?? ''
  }
}

// Segunda linha de cada link no editor
export function linkMeta(link: ManagedLink): string {
  const target =
    link.kind === 'URL'
      ? host(link.url)
      : link.kind === 'INTERNAL' && link.internalTarget
        ? `Tela do Flow · ${INTERNAL_TARGETS[link.internalTarget]}`
        : LINK_KINDS[link.kind]
  const status = LINK_STATUS[link.status]
  return status ? `${status} · ${target}` : target
}
