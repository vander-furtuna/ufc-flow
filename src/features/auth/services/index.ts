import { api } from '@/lib/ky-api'
import { SignInSchema, SignUpSchema } from '../schemas/auth.schema'
import { SignInResponse, User } from '../types'

export async function signInRequest(
  data: SignInSchema,
): Promise<SignInResponse> {
  return api.post('auth/sign-in', { json: data }).json<SignInResponse>()
}

export async function signUpRequest(data: SignUpSchema): Promise<User> {
  return api.post('auth/sign-up', { json: data }).json<User>()
}

export async function signOutRequest(): Promise<void> {
  await api.post('auth/sign-out')
}
