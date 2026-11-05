import { extractMentions } from '@ufc-flow/academic-core'
import { FORUM_LIMITS, type MessageStatus } from '@ufc-flow/contracts'

import { ForumErrors } from './errors'

export type Message = {
  id: string
  courseId: string
  // Nulo quando a conta foi excluída
  authorId: string | null
  parentId: string | null
  rootId: string | null
  content: string
  replyCount: number
  likeCount: number
  status: MessageStatus
  createdAt: Date
  editedAt: Date | null
  removedAt: Date | null
  // O próprio autor (apagou) ou quem moderou
  removedBy: string | null
  removalReason: string | null
}

const EDIT_WINDOW_MS = FORUM_LIMITS.editMinutes * 60_000

// Códigos citados com @, sem repetir; mais de 5 recusa a mensagem
export function mentionCodes(content: string): string[] {
  const codes = extractMentions(content)
  if (codes.length > FORUM_LIMITS.mentions) throw ForumErrors.tooManyMentions()
  return codes
}

export function newMessage(input: {
  id: string
  courseId: string
  authorId: string
  content: string
  parent: Message | null
  now: Date
}): Message {
  const { parent } = input
  // Só se responde o que está no ar
  if (parent && parent.status !== 'VISIBLE') throw ForumErrors.unavailable()
  return {
    id: input.id,
    courseId: input.courseId,
    authorId: input.authorId,
    parentId: parent?.id ?? null,
    rootId: parent ? (parent.rootId ?? parent.id) : null,
    content: input.content,
    replyCount: 0,
    likeCount: 0,
    status: 'VISIBLE',
    createdAt: input.now,
    editedAt: null,
    removedAt: null,
    removedBy: null,
    removalReason: null,
  }
}

export function editableUntil(
  message: Message,
  viewerId: string | null,
  now: Date,
): Date | null {
  if (message.authorId === null || message.authorId !== viewerId) return null
  if (message.status !== 'VISIBLE') return null
  const until = new Date(message.createdAt.getTime() + EDIT_WINDOW_MS)
  return now <= until ? until : null
}

// Edição pelo autor em até 15 min; `edited_at` aparece na tela
export function editMessage(
  message: Message,
  actorId: string,
  content: string,
  now: Date,
): Message {
  if (message.authorId !== actorId) throw ForumErrors.notAuthor()
  if (message.status !== 'VISIBLE') throw ForumErrors.unavailable()
  if (!editableUntil(message, actorId, now)) throw ForumErrors.editClosed()
  return { ...message, content, editedAt: now }
}

// Apagar a própria: sem respostas some; com respostas o conteúdo sai e fica
// "mensagem apagada", para manter a conversa
export function deletionOf(
  message: Message,
  actorId: string,
  now: Date,
): { kind: 'DELETE' } | { kind: 'REMOVE'; message: Message } {
  if (message.authorId !== actorId) throw ForumErrors.notAuthor()
  if (message.status === 'REMOVED') throw ForumErrors.unavailable()
  if (message.replyCount === 0) return { kind: 'DELETE' }
  return {
    kind: 'REMOVE',
    message: {
      ...message,
      content: '',
      status: 'REMOVED',
      removedAt: now,
      removedBy: actorId,
    },
  }
}

// Motivo gravado nas mensagens de quem excluiu a conta (LGPD): o texto some,
// a thread fica e o aviso diz "mensagem removida"
export const ACCOUNT_DELETED_REASON = 'ACCOUNT_DELETED'

export type RateLimits = {
  // Mensagens permitidas a cada `burstSeconds`
  burst: number
  burstSeconds: number
  hourly: number
}

// Limite de envio por pessoa (respostas contam; curtidas não)
export function assertRate(
  recent: { inBurst: number; inHour: number },
  limits: RateLimits,
) {
  if (recent.inBurst >= limits.burst || recent.inHour >= limits.hourly) {
    throw ForumErrors.rateLimited()
  }
}

export type Viewer = { userId: string | null; canModerate: boolean }

// FULL mostra o texto; PLACEHOLDER mostra só o aviso ("mensagem apagada",
// "oculta pela moderação"); NONE tira da lista. Oculta: o autor e a
// moderação veem; para os demais some, ou vira aviso se tiver respostas.
export function visibilityOf(
  message: Message,
  viewer: Viewer,
): 'FULL' | 'PLACEHOLDER' | 'NONE' {
  if (message.status === 'VISIBLE') return 'FULL'
  if (message.status === 'REMOVED') return 'PLACEHOLDER'
  if (viewer.canModerate || message.authorId === viewer.userId) return 'FULL'
  return message.replyCount > 0 ? 'PLACEHOLDER' : 'NONE'
}
