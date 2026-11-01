import type { ModeratorRequestStatus } from '@ufc-flow/contracts'

import { IdentityErrors } from './errors'

// Pedido de moderação de um curso: o usuário pede, um admin aprova ou
// rejeita, e o próprio usuário pode cancelar enquanto está pendente
export type ModeratorRequest = {
  id: string
  userId: string
  courseId: string
  justification: string
  status: ModeratorRequestStatus
  reviewedBy: string | null
  reviewedAt: Date | null
  reviewNote: string | null
  createdAt: Date
}

type Review = { reviewerId: string; now: Date; note: string | null }

export function checkNewModeratorRequest(state: {
  hasPending: boolean
  isModerator: boolean
}) {
  if (state.isModerator) throw IdentityErrors.moderatorAlreadyActive()
  if (state.hasPending) throw IdentityErrors.moderatorRequestPendingExists()
}

const assertPending = (request: ModeratorRequest) => {
  if (request.status !== 'PENDING') {
    throw IdentityErrors.moderatorRequestNotPending()
  }
}

const review = (
  request: ModeratorRequest,
  status: 'APPROVED' | 'REJECTED',
  { reviewerId, now, note }: Review,
): ModeratorRequest => {
  assertPending(request)
  return {
    ...request,
    status,
    reviewedBy: reviewerId,
    reviewedAt: now,
    reviewNote: note,
  }
}

export const approveModeratorRequest = (
  request: ModeratorRequest,
  by: Review,
) => review(request, 'APPROVED', by)

export const rejectModeratorRequest = (request: ModeratorRequest, by: Review) =>
  review(request, 'REJECTED', by)

export function cancelModeratorRequest(
  request: ModeratorRequest,
  userId: string,
): ModeratorRequest {
  if (request.userId !== userId) throw IdentityErrors.accessDenied()
  assertPending(request)
  return { ...request, status: 'CANCELED' }
}
