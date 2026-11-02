import type {
  AuthTokens,
  CourseSummary,
  Me,
  ModeratorRequest,
  UserRole,
} from '@ufc-flow/contracts'

import type { ModeratorRequestRecord, User } from '../domain/ports'

// Conversão do domínio para os formatos do packages/contracts

export const toMe = (
  user: User,
  roles: UserRole[],
  moderatedCourses: CourseSummary[],
): Me => ({
  id: user.id,
  name: user.name,
  email: user.email,
  status: user.status,
  roles,
  moderatedCourses,
  avatarFileId: user.avatarFileId ?? null,
  createdAt: user.createdAt.toISOString(),
})

export const toModeratorRequest = (
  record: ModeratorRequestRecord,
): ModeratorRequest => ({
  id: record.id,
  user: record.user,
  course: record.course,
  justification: record.justification,
  status: record.status,
  reviewNote: record.reviewNote,
  reviewedAt: record.reviewedAt?.toISOString() ?? null,
  createdAt: record.createdAt.toISOString(),
})

export const toTokens = (
  access: { token: string; expiresAt: Date },
  refresh: { token: string; expiresAt: Date },
): AuthTokens => ({
  tokenType: 'Bearer',
  accessToken: access.token,
  accessTokenExpiresAt: access.expiresAt.toISOString(),
  refreshToken: refresh.token,
  refreshTokenExpiresAt: refresh.expiresAt.toISOString(),
})
