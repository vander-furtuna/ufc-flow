import type { PostStatus, PostType } from '@ufc-flow/contracts'

// Tipos de post do hub (mockup Hub): rótulo, filtro e cor do selo, num só lugar
export const POST_TYPES: Record<
  PostType,
  { label: string; filter: string; badge: string }
> = {
  NEWS: {
    label: 'Notícia',
    filter: 'Notícias',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  EVENT: {
    label: 'Evento',
    filter: 'Eventos',
    badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300',
  },
  SCHOLARSHIP: {
    label: 'Bolsa',
    filter: 'Bolsas',
    badge:
      'bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300',
  },
  EXTENSION_PROJECT: {
    label: 'Extensão',
    filter: 'Extensão',
    badge:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  },
  CALL: {
    label: 'Edital',
    filter: 'Editais',
    badge:
      'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
  },
}

export const POST_TYPE_ORDER: PostType[] = [
  'NEWS',
  'EVENT',
  'SCHOLARSHIP',
  'EXTENSION_PROJECT',
  'CALL',
]

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Arquivado',
}
