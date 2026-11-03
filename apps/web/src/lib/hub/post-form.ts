import {
  postInputSchema,
  type ParsedPostInput,
  type PostStatus,
  type PostType,
  type PostView,
} from '@ufc-flow/contracts'

// Estado do formulário de post: tudo em texto, como nos campos. As datas são
// datetime-local no horário de Fortaleza (UTC-3, ver post-display).
export type PostFormState = {
  type: PostType
  title: string
  summary: string
  bodyMd: string
  coverFileId: string | null
  imageFileIds: string[]
  externalUrl: string
  status: PostStatus
  pinned: boolean
  startsAt: string
  endsAt: string
  deadlineAt: string
  location: string
  attributes: Record<string, string>
}

export type AttributeField = {
  key: string
  label: string
  kind: 'text' | 'url' | 'int' | 'money' | 'modality'
}

// O que vai em `attributes` em cada tipo (modelagem, Hub do curso)
export const ATTRIBUTE_FIELDS: Record<PostType, AttributeField[]> = {
  NEWS: [],
  EVENT: [
    { key: 'modality', label: 'Modalidade', kind: 'modality' },
    { key: 'registrationUrl', label: 'Link de inscrição', kind: 'url' },
  ],
  SCHOLARSHIP: [
    { key: 'amountBrl', label: 'Valor mensal (R$)', kind: 'money' },
    { key: 'vacancies', label: 'Vagas', kind: 'int' },
    { key: 'weeklyHours', label: 'Horas por semana', kind: 'int' },
    { key: 'sponsor', label: 'Financiador', kind: 'text' },
    { key: 'requirements', label: 'Requisitos', kind: 'text' },
  ],
  EXTENSION_PROJECT: [
    { key: 'coordinator', label: 'Coordenação', kind: 'text' },
    { key: 'vacancies', label: 'Vagas', kind: 'int' },
    { key: 'contact', label: 'Contato', kind: 'text' },
  ],
  CALL: [
    { key: 'number', label: 'Número do edital', kind: 'text' },
    { key: 'issuer', label: 'Órgão emissor', kind: 'text' },
    { key: 'documentUrl', label: 'Link do documento', kind: 'url' },
  ],
}

const OFFSET = '-03:00'
const OFFSET_MS = 3 * 60 * 60 * 1000

export function fromLocalInput(value: string): string | null {
  if (!value) return null
  const date = new Date(`${value}:00${OFFSET}`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function toLocalInput(instant: string | null): string {
  if (!instant) return ''
  return new Date(new Date(instant).getTime() - OFFSET_MS)
    .toISOString()
    .slice(0, 16)
}

export function emptyPostForm(type: PostType = 'NEWS'): PostFormState {
  return {
    type,
    title: '',
    summary: '',
    bodyMd: '',
    coverFileId: null,
    imageFileIds: [],
    externalUrl: '',
    status: 'PUBLISHED',
    pinned: false,
    startsAt: '',
    endsAt: '',
    deadlineAt: '',
    location: '',
    attributes: {},
  }
}

export function postFormFromView(post: PostView): PostFormState {
  return {
    type: post.type,
    title: post.title,
    summary: post.summary ?? '',
    bodyMd: post.bodyMd,
    coverFileId: post.coverFileId,
    imageFileIds: post.imageFileIds,
    externalUrl: post.externalUrl ?? '',
    status: post.status,
    pinned: post.pinned,
    startsAt: toLocalInput(post.startsAt),
    endsAt: toLocalInput(post.endsAt),
    deadlineAt: toLocalInput(post.deadlineAt),
    location: post.location ?? '',
    attributes: Object.fromEntries(
      Object.entries(post.attributes).map(([key, value]) => [
        key,
        typeof value === 'number'
          ? String(value).replace('.', ',')
          : typeof value === 'string'
            ? value
            : '',
      ]),
    ),
  }
}

export type PostFormErrors = Record<string, string>

export type PostFormResult =
  { ok: true; input: ParsedPostInput } | { ok: false; errors: PostFormErrors }

const REQUIRED: Record<string, string> = {
  title: 'Dê um título ao post',
  bodyMd: 'Escreva o texto do post',
  startsAt: 'Informe quando o evento começa',
  deadlineAt: 'Informe o prazo',
}

type Issue = { path: PropertyKey[]; code: string; message: string } & {
  maximum?: unknown
  format?: string
}

function messageOf(issue: Issue, field: string): string {
  if (issue.code === 'custom') return issue.message
  if (issue.code === 'too_big' && typeof issue.maximum === 'number') {
    return field === 'imageFileIds'
      ? `Use até ${issue.maximum} imagens`
      : `Use até ${issue.maximum} caracteres`
  }
  if (issue.code === 'invalid_format' && issue.format === 'url') {
    return 'Use um endereço completo, com https://'
  }
  return REQUIRED[field] ?? 'Confira este campo'
}

// Atributos do tipo escolhido, convertidos; os de outro tipo ficam de fora
function parseAttributes(
  state: PostFormState,
  errors: PostFormErrors,
): Record<string, unknown> {
  const attributes: Record<string, unknown> = {}
  for (const field of ATTRIBUTE_FIELDS[state.type]) {
    const raw = state.attributes[field.key]?.trim() ?? ''
    if (!raw) continue
    if (field.kind === 'int') {
      if (!/^\d+$/.test(raw) || Number(raw) === 0) {
        errors[`attributes.${field.key}`] = 'Use um número inteiro'
        continue
      }
      attributes[field.key] = Number(raw)
    } else if (field.kind === 'money') {
      const value = Number(raw.replace(/\./g, '').replace(',', '.'))
      if (!Number.isFinite(value) || value < 0) {
        errors[`attributes.${field.key}`] = 'Use um valor em reais'
        continue
      }
      attributes[field.key] = value
    } else {
      attributes[field.key] = raw
    }
  }
  return attributes
}

export function validatePostForm(state: PostFormState): PostFormResult {
  const errors: PostFormErrors = {}
  const attributes = parseAttributes(state, errors)
  const parsed = postInputSchema.safeParse({
    type: state.type,
    title: state.title,
    summary: state.summary,
    bodyMd: state.bodyMd,
    coverFileId: state.coverFileId,
    imageFileIds: state.imageFileIds,
    externalUrl: state.externalUrl.trim() || null,
    status: state.status,
    pinned: state.pinned,
    startsAt: fromLocalInput(state.startsAt),
    endsAt: fromLocalInput(state.endsAt),
    deadlineAt: fromLocalInput(state.deadlineAt),
    location: state.location,
    attributes,
  })
  if (!parsed.success) {
    for (const issue of parsed.error.issues as Issue[]) {
      const key = issue.path.map(String).join('.')
      const field = String(issue.path[0] ?? '')
      errors[key] ??= messageOf(issue, field)
    }
  }
  if (Object.keys(errors).length > 0 || !parsed.success) {
    return { ok: false, errors }
  }
  return { ok: true, input: parsed.data }
}
