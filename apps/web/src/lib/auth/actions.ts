'use server'

import {
  resetPasswordInputSchema,
  signInInputSchema,
  signUpInputSchema,
  type AuthSession,
  type ProblemDetails,
  type ResetPasswordInput,
  type SignInInput,
  type SignUpInput,
} from '@ufc-flow/contracts'

import { callApi } from './api'
import {
  clearSession,
  clientContext,
  getRefreshToken,
  saveSession,
} from './session'

export type ActionResult =
  | { ok: true }
  | { ok: false; problem: Pick<ProblemDetails, 'code' | 'detail' | 'errors'> }

const invalid = (): ActionResult => ({
  ok: false,
  problem: { code: 'VALIDATION_FAILED', detail: 'Confira os campos' },
})

async function openSession(path: string, body: unknown): Promise<ActionResult> {
  const result = await callApi<AuthSession>(path, {
    method: 'POST',
    body,
    ...(await clientContext()),
  })
  if (!result.ok) return { ok: false, problem: result.problem }
  await saveSession(result.data.tokens)
  return { ok: true }
}

export async function signInAction(input: SignInInput): Promise<ActionResult> {
  const parsed = signInInputSchema.safeParse(input)
  if (!parsed.success) return invalid()
  return openSession('/v1/auth/sign-in', parsed.data)
}

export async function signUpAction(input: SignUpInput): Promise<ActionResult> {
  const parsed = signUpInputSchema.safeParse(input)
  if (!parsed.success) return invalid()
  return openSession('/v1/auth/sign-up', parsed.data)
}

export async function signOutAction(): Promise<void> {
  const refreshToken = await getRefreshToken()
  if (refreshToken) {
    await callApi('/v1/auth/sign-out', {
      method: 'POST',
      body: { refreshToken },
    })
  }
  await clearSession()
}

export async function resetPasswordAction(
  input: ResetPasswordInput,
): Promise<ActionResult> {
  const parsed = resetPasswordInputSchema.safeParse(input)
  if (!parsed.success) return invalid()
  const result = await callApi('/v1/auth/password-reset', {
    method: 'POST',
    body: parsed.data,
    ...(await clientContext()),
  })
  if (!result.ok) return { ok: false, problem: result.problem }
  await clearSession()
  return { ok: true }
}
