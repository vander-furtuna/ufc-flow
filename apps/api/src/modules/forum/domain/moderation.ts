import {
  AUTO_HIDE_REPORTS,
  type MessageModerationInput,
  type ReportReason,
  type ReportStatus,
  type RestrictionType,
} from '@ufc-flow/contracts'

import { ForumErrors } from './errors'
import type { Message } from './message'

export type Report = {
  id: string
  messageId: string
  reporterId: string
  reason: ReportReason
  details: string | null
  // Texto no momento da denúncia: editar não apaga a prova
  contentSnapshot: string
  status: ReportStatus
  resolvedBy: string | null
  resolvedAt: Date | null
  createdAt: Date
}

export type Restriction = {
  id: string
  userId: string
  courseId: string
  type: RestrictionType
  reason: string
  createdBy: string | null
  createdAt: Date
  expiresAt: Date | null
  liftedAt: Date | null
}

export type ModerationAction =
  | 'HIDE_MESSAGE'
  | 'REMOVE_MESSAGE'
  | 'RESTORE_MESSAGE'
  | 'MUTE_USER'
  | 'BAN_USER'
  | 'LIFT_RESTRICTION'

const DAY_MS = 24 * 60 * 60 * 1000

// Qualquer leitor denuncia, uma vez, a mensagem de outra pessoa
export function assertCanReport(message: Message, reporterId: string) {
  if (message.authorId === reporterId) throw ForumErrors.cannotReportOwn()
  if (message.status === 'REMOVED') throw ForumErrors.unavailable()
}

// 3 denúncias abertas de pessoas diferentes ocultam até alguém decidir
export function shouldAutoHide(message: Message, openReporters: number) {
  return message.status === 'VISIBLE' && openReporters >= AUTO_HIDE_REPORTS
}

// Ocultar, remover ou restaurar. A removida guarda o texto (para restaurar)
// e mostra só a categoria pública.
export function moderate(
  message: Message,
  input: MessageModerationInput,
  moderatorId: string,
  now: Date,
): Message {
  switch (input.action) {
    case 'HIDE':
      if (message.status !== 'VISIBLE') throw ForumErrors.invalidModeration()
      return { ...message, status: 'HIDDEN' }
    case 'REMOVE':
      if (message.status === 'REMOVED') throw ForumErrors.invalidModeration()
      return {
        ...message,
        status: 'REMOVED',
        removedAt: now,
        removedBy: moderatorId,
        removalReason: input.category,
      }
    case 'RESTORE': {
      const byAuthor =
        message.status === 'REMOVED' && message.removedBy === message.authorId
      if (message.status === 'VISIBLE' || byAuthor) {
        throw ForumErrors.invalidModeration()
      }
      return {
        ...message,
        status: 'VISIBLE',
        removedAt: null,
        removedBy: null,
        removalReason: null,
      }
    }
  }
}

export function newRestriction(input: {
  id: string
  userId: string
  courseId: string
  type: RestrictionType
  reason: string
  createdBy: string
  days: number | null
  now: Date
}): Restriction {
  return {
    id: input.id,
    userId: input.userId,
    courseId: input.courseId,
    type: input.type,
    reason: input.reason,
    createdBy: input.createdBy,
    createdAt: input.now,
    expiresAt:
      input.days === null
        ? null
        : new Date(input.now.getTime() + input.days * DAY_MS),
    liftedAt: null,
  }
}

export const isActive = (restriction: Restriction, now: Date) =>
  restriction.liftedAt === null &&
  (restriction.expiresAt === null || restriction.expiresAt > now)

// MUTE: lê, mas não escreve nem curte. BAN: não acessa o fórum do curso.
export function blocks(
  restriction: Restriction | null,
  action: 'READ' | 'WRITE',
): boolean {
  if (!restriction) return false
  return action === 'WRITE' || restriction.type === 'BAN'
}

// A moderação não restringe a si nem outro moderador do curso ou admin
export function assertCanRestrict(
  actorId: string,
  target: { userId: string; isAdmin: boolean; moderatesCourse: boolean },
) {
  if (target.userId === actorId) throw ForumErrors.cannotRestrictSelf()
  if (target.isAdmin || target.moderatesCourse) {
    throw ForumErrors.cannotRestrictStaff()
  }
}
