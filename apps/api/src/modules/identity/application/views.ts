import type {
  AdminUser,
  AuthTokens,
  ConsentDocument,
  CourseSummary,
  Me,
  ModeratorRequest,
  UserRole,
} from '@ufc-flow/contracts'

import { pendingConsents, type ConsentVersions } from '../domain/account'
import { IdentityErrors } from '../domain/errors'
import type {
  IdentityRepositories,
  ModeratorRequestRecord,
  User,
  UserListing,
} from '../domain/ports'

// Conversão do domínio para os formatos do packages/contracts

export const toMe = (
  user: User,
  roles: UserRole[],
  moderatedCourses: CourseSummary[],
  pending: ConsentDocument[],
): Me => ({
  id: user.id,
  name: user.name,
  email: user.email,
  status: user.status,
  roles,
  moderatedCourses,
  avatarFileId: user.avatarFileId ?? null,
  pendingConsents: pending,
  createdAt: user.createdAt.toISOString(),
})

// Me completo, com papéis, cursos moderados e aceites pendentes
export async function loadMe(
  repos: Pick<IdentityRepositories, 'users' | 'moderation'>,
  userOrId: User | string,
  versions: ConsentVersions,
): Promise<Me> {
  const user =
    typeof userOrId === 'string'
      ? await repos.users.findById(userOrId)
      : userOrId
  if (!user) throw IdentityErrors.userNotFound()
  return toMe(
    user,
    await repos.users.rolesOf(user.id),
    await repos.moderation.moderatedCourses(user.id),
    pendingConsents(await repos.users.consentsOf(user.id), versions),
  )
}

export const toAdminUser = (row: UserListing): AdminUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  status: row.status,
  roles: row.roles,
  evaluationCount: row.evaluationCount,
  createdAt: row.createdAt.toISOString(),
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
