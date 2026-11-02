'use server'

import {
  avatarInputSchema,
  type Me,
  type ProblemDetails,
} from '@ufc-flow/contracts'

import { userFetch } from '@/lib/auth/user-api'

export type AvatarResult =
  | { ok: true; data: Me }
  | { ok: false; problem: Pick<ProblemDetails, 'code' | 'detail'> }

async function call(
  method: 'PUT' | 'DELETE',
  body?: unknown,
): Promise<AvatarResult> {
  const result = await userFetch<Me>('/v1/me/avatar', { method, body })
  if (result.ok) return result
  const { code, detail } = result.problem
  return { ok: false, problem: { code, detail } }
}

export async function setAvatarAction(fileId: string) {
  const parsed = avatarInputSchema.safeParse({ fileId })
  if (!parsed.success) {
    return {
      ok: false,
      problem: { code: 'VALIDATION_FAILED', detail: 'Arquivo inválido' },
    } satisfies AvatarResult
  }
  return call('PUT', parsed.data)
}

export async function removeAvatarAction() {
  return call('DELETE')
}
