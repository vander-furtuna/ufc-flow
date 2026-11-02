import type { SigaaCourse } from '@ufc-flow/academic-core'
import {
  curriculumImportSchema,
  sigaaCourseEntrySchema,
  subjectSchema,
  type CurriculumImportV1,
  type CurriculumImportView,
} from '@ufc-flow/contracts'
import { z } from 'zod'

// Chamadas da extensão à API do Flow. Rodam no service worker (background),
// que tem permissão de host; o content script do SIGAA pede por mensagem.

export type SendFailure =
  'SIGNED_OUT' | 'FORBIDDEN' | 'REJECTED' | 'UNAVAILABLE'

export type SendResult =
  | { ok: true; view: CurriculumImportView }
  | { ok: false; reason: SendFailure; message: string }

const MESSAGES: Record<SendFailure, string> = {
  SIGNED_OUT: 'Entre com sua conta do Flow pelo ícone da extensão para enviar.',
  FORBIDDEN:
    'Sua conta não pode enviar esta grade: só moderadores do curso e administradores.',
  REJECTED: 'O Flow recusou o arquivo.',
  UNAVAILABLE: 'Não foi possível falar com o Flow. Tente de novo.',
}

// A API aceita até 300 códigos por busca
const CHUNK = 300

async function detailOf(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { detail?: unknown }
    return typeof body.detail === 'string' ? body.detail : null
  } catch {
    return null
  }
}

export function createFlowApi({
  apiUrl,
  accessToken,
  fetch = globalThis.fetch,
}: {
  apiUrl: string
  accessToken: () => Promise<string | null>
  fetch?: typeof globalThis.fetch
}) {
  async function authorized(path: string, init: RequestInit = {}) {
    const token = await accessToken()
    if (!token) return null
    const headers = new Headers(init.headers)
    headers.set('authorization', `Bearer ${token}`)
    return fetch(`${apiUrl}${path}`, { ...init, headers })
  }

  async function sendCurriculum(
    payload: CurriculumImportV1,
  ): Promise<SendResult> {
    const fail = (reason: SendFailure, message = MESSAGES[reason]) =>
      ({ ok: false, reason, message }) as const
    let response: Response | null
    try {
      response = await authorized('/v1/ingestion/curriculum-imports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {
      return fail('UNAVAILABLE')
    }
    if (!response || response.status === 401) return fail('SIGNED_OUT')
    if (response.status === 403) return fail('FORBIDDEN')
    if (response.status >= 500) return fail('UNAVAILABLE')
    if (!response.ok) {
      return fail('REJECTED', (await detailOf(response)) ?? MESSAGES.REJECTED)
    }
    const parsed = curriculumImportSchema.safeParse(await response.json())
    return parsed.success
      ? { ok: true, view: parsed.data }
      : fail('UNAVAILABLE')
  }

  async function getImport(id: string): Promise<CurriculumImportView | null> {
    try {
      const response = await authorized(
        `/v1/ingestion/curriculum-imports/${id}`,
      )
      if (!response?.ok) return null
      const parsed = curriculumImportSchema.safeParse(await response.json())
      return parsed.success ? parsed.data : null
    } catch {
      return null
    }
  }

  // Nome de cada código no catálogo do Flow; null se a API não responde
  async function subjectNames(
    codes: readonly string[],
  ): Promise<Map<string, string> | null> {
    const names = new Map<string, string>()
    try {
      for (let start = 0; start < codes.length; start += CHUNK) {
        const chunk = codes.slice(start, start + CHUNK)
        const response = await fetch(
          `${apiUrl}/v1/subjects?codes=${encodeURIComponent(chunk.join(','))}`,
        )
        if (!response.ok) return null
        const parsed = z.array(subjectSchema).safeParse(await response.json())
        if (!parsed.success) return null
        for (const subject of parsed.data) names.set(subject.code, subject.name)
      }
      return names
    } catch {
      return null
    }
  }

  async function sigaaCourses(): Promise<SigaaCourse[] | null> {
    try {
      const response = await fetch(`${apiUrl}/v1/sigaa-courses`)
      if (!response.ok) return null
      const parsed = z
        .array(sigaaCourseEntrySchema)
        .safeParse(await response.json())
      if (!parsed.success || parsed.data.length === 0) return null
      return parsed.data
        .filter((entry) => !entry.removed)
        .map((entry) => entry.sigaaCourse)
    } catch {
      return null
    }
  }

  return { sendCurriculum, getImport, subjectNames, sigaaCourses }
}

export type FlowApi = ReturnType<typeof createFlowApi>
