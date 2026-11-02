import type { FilePurpose, FileView, ProblemDetails } from '@ufc-flow/contracts'

export type UploadResult =
  | { ok: true; data: FileView }
  | { ok: false; problem: Pick<ProblemDetails, 'code' | 'detail'> }

// Endereço público do arquivo, servido pelo web
export const fileUrl = (id: string) => `/arquivos/${id}`

// Envia pelo BFF (/api/files), que repassa à API com o token do cookie
export async function uploadFile(
  file: File,
  purpose: FilePurpose,
  courseId?: string,
): Promise<UploadResult> {
  const form = new FormData()
  form.set('purpose', purpose)
  if (courseId) form.set('courseId', courseId)
  form.set('file', file, file.name)
  try {
    const response = await fetch('/api/files', { method: 'POST', body: form })
    const payload: unknown = await response.json().catch(() => null)
    if (response.ok) return { ok: true, data: payload as FileView }
    const problem = payload as Partial<ProblemDetails> | null
    return {
      ok: false,
      problem: {
        code: problem?.code ?? 'UPLOAD_FAILED',
        detail: problem?.detail ?? 'Não foi possível enviar o arquivo.',
      },
    }
  } catch {
    return {
      ok: false,
      problem: {
        code: 'UPLOAD_FAILED',
        detail: 'Não foi possível enviar o arquivo.',
      },
    }
  }
}
