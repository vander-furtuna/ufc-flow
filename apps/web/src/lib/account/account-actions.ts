'use server'

import {
  CONSENT_VERSIONS,
  accountDeletionInputSchema,
  adminUserListQuerySchema,
  createModeratorRequestInputSchema,
  type AdminUserListQuery,
  type AdminUserPage,
  type DiscardedEvaluations,
  type Me,
  type ModeratorRequest,
  type PasswordResetLink,
  type ProblemDetails,
} from '@ufc-flow/contracts'

import { clearSession } from '@/lib/auth/session'
import { userFetch } from '@/lib/auth/user-api'

export type AccountResult<T> =
  | { ok: true; data: T }
  | { ok: false; problem: Pick<ProblemDetails, 'code' | 'detail' | 'status'> }

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<AccountResult<T>> {
  const result = await userFetch<T>(path, init)
  if (result.ok) return result
  const { code, detail, status } = result.problem
  return { ok: false, problem: { code, detail, status } }
}

const invalid = (detail: string): AccountResult<never> => ({
  ok: false,
  problem: { code: 'VALIDATION_FAILED', detail, status: 400 },
})

const user = (id: string) => `/v1/admin/users/${encodeURIComponent(id)}`

// Novo aceite: manda as versões que o web mostra (as do contracts)
export async function acceptConsentsAction() {
  return call<Me>('/v1/me/consents', {
    method: 'POST',
    body: {
      termsVersion: CONSENT_VERSIONS.terms,
      privacyVersion: CONSENT_VERSIONS.privacy,
    },
  })
}

// Exclusão de conta: com a conta apagada, os cookies da sessão saem também
export async function deleteAccountAction(password: string) {
  const parsed = accountDeletionInputSchema.safeParse({ password })
  if (!parsed.success) return invalid('Informe a senha')
  const result = await call<void>('/v1/me', {
    method: 'DELETE',
    body: parsed.data,
  })
  if (result.ok) await clearSession()
  return result
}

// Admin › Usuários
export async function listUsersAction(query: Partial<AdminUserListQuery>) {
  const parsed = adminUserListQuerySchema.safeParse(query)
  if (!parsed.success) return invalid('Busca inválida')
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return call<AdminUserPage>(`/v1/admin/users?${params}`)
}

export async function suspendUserAction(id: string) {
  return call<void>(`${user(id)}/suspend`, { method: 'POST' })
}

export async function reactivateUserAction(id: string) {
  return call<void>(`${user(id)}/reactivate`, { method: 'POST' })
}

export async function passwordResetLinkAction(id: string) {
  return call<PasswordResetLink>(`${user(id)}/password-reset-links`, {
    method: 'POST',
  })
}

export async function discardEvaluationsAction(id: string) {
  return call<DiscardedEvaluations>(`${user(id)}/evaluations`, {
    method: 'DELETE',
  })
}

// Pedidos de moderação da própria pessoa (aprovados por um admin)
export async function myModeratorRequestsAction() {
  return call<ModeratorRequest[]>('/v1/me/moderator-requests')
}

export async function requestModerationAction(
  courseId: string,
  justification: string,
) {
  const parsed = createModeratorRequestInputSchema.safeParse({
    courseId,
    justification,
  })
  if (!parsed.success) return invalid(parsed.error.issues[0]!.message)
  return call<ModeratorRequest>('/v1/moderator-requests', {
    method: 'POST',
    body: parsed.data,
  })
}

export async function cancelModeratorRequestAction(id: string) {
  return call<ModeratorRequest>(
    `/v1/moderator-requests/${encodeURIComponent(id)}/cancel`,
    { method: 'POST' },
  )
}
