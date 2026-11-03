'use server'

import {
  linkInputSchema,
  linkOrderInputSchema,
  linkPageSettingsInputSchema,
  linkSectionInputSchema,
  socialLinkInputSchema,
  type LinkInput,
  type LinkOrderInput,
  type LinkPageSettingsInput,
  type LinkSectionInput,
  type LinkStats,
  type LinkTrafficSource,
  type ManagedLinkPage,
  type ProblemDetails,
  type SocialLinkInput,
} from '@ufc-flow/contracts'
import type { z } from 'zod'

import { callApi } from '@/lib/auth/api'
import { userFetch } from '@/lib/auth/user-api'

export type LinkPageResult<T> =
  | { ok: true; data: T }
  | { ok: false; problem: Pick<ProblemDetails, 'code' | 'detail' | 'status'> }

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<LinkPageResult<T>> {
  const result = await userFetch<T>(path, init)
  if (result.ok) return result
  const { code, detail, status } = result.problem
  return { ok: false, problem: { code, detail, status } }
}

const base = (course: string) =>
  `/v1/courses/${encodeURIComponent(course)}/link-page`

// Valida com o mesmo schema da API antes de enviar
async function send<S extends z.ZodType>(
  schema: S,
  input: unknown,
  path: string,
  method: string,
): Promise<LinkPageResult<ManagedLinkPage>> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      problem: {
        code: 'VALIDATION_FAILED',
        detail: parsed.error.issues[0]?.message ?? 'Dados inválidos',
        status: 400,
      },
    }
  }
  return call<ManagedLinkPage>(path, { method, body: parsed.data })
}

// O editor abre a página; ela nasce no primeiro acesso (D86)
export async function managedPageAction(course: string) {
  return call<ManagedLinkPage>(base(course))
}

export async function saveSettingsAction(
  course: string,
  input: LinkPageSettingsInput,
) {
  return send(linkPageSettingsInputSchema, input, base(course), 'PUT')
}

export async function saveSectionAction(
  course: string,
  id: string | null,
  input: LinkSectionInput,
) {
  const path = `${base(course)}/sections${id ? `/${encodeURIComponent(id)}` : ''}`
  return send(linkSectionInputSchema, input, path, id ? 'PUT' : 'POST')
}

export async function removeSectionAction(course: string, id: string) {
  return call<ManagedLinkPage>(
    `${base(course)}/sections/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}

export async function saveLinkAction(
  course: string,
  id: string | null,
  input: LinkInput,
) {
  const path = `${base(course)}/links${id ? `/${encodeURIComponent(id)}` : ''}`
  return send(linkInputSchema, input, path, id ? 'PUT' : 'POST')
}

export async function removeLinkAction(course: string, id: string) {
  return call<ManagedLinkPage>(
    `${base(course)}/links/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}

export async function saveSocialAction(
  course: string,
  id: string | null,
  input: SocialLinkInput,
) {
  const path = `${base(course)}/social-links${id ? `/${encodeURIComponent(id)}` : ''}`
  return send(socialLinkInputSchema, input, path, id ? 'PUT' : 'POST')
}

export async function removeSocialAction(course: string, id: string) {
  return call<ManagedLinkPage>(
    `${base(course)}/social-links/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}

export async function saveOrderAction(course: string, input: LinkOrderInput) {
  return send(linkOrderInputSchema, input, `${base(course)}/order`, 'PUT')
}

export async function linkStatsAction(course: string, days: 7 | 30) {
  return call<LinkStats>(`${base(course)}/stats?days=${days}`)
}

// Visita contada pela própria página: a leitura fica em cache (D89)
export async function countViewAction(slug: string, source: LinkTrafficSource) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return
  await callApi<void>(`/v1/link-pages/${slug}/views`, {
    method: 'POST',
    body: { source },
  })
}
