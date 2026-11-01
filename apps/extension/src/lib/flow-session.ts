import {
  authSessionSchema,
  authTokensSchema,
  type AuthTokens,
  type Me,
} from '@ufc-flow/contracts'

// Sessão da extensão com a API do Flow: Bearer no cabeçalho e o refresh token
// no corpo (o web usa cookies). Fica em chrome.storage.local, só nesta
// extensão; o login do SIGAA nunca passa por aqui.

export type StoredSession = { user: Me; tokens: AuthTokens }

export interface SessionStore {
  get(): Promise<StoredSession | null>
  set(session: StoredSession): Promise<void>
  clear(): Promise<void>
}

export type SignInResult =
  { ok: true; user: Me } | { ok: false; message: string }

// Renova um pouco antes de vencer, para o token não expirar no caminho
const REFRESH_MARGIN_MS = 30_000
const UNAVAILABLE = 'Não foi possível falar com o Flow. Tente de novo.'

async function problemDetail(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { detail?: unknown }
    return typeof body.detail === 'string' ? body.detail : null
  } catch {
    return null
  }
}

export function createFlowClient({
  apiUrl,
  store,
  fetch = globalThis.fetch,
  now = () => new Date(),
}: {
  apiUrl: string
  store: SessionStore
  fetch?: typeof globalThis.fetch
  now?: () => Date
}) {
  const post = (path: string, body: unknown) =>
    fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })

  async function signIn(
    email: string,
    password: string,
  ): Promise<SignInResult> {
    let response: Response
    try {
      response = await post('/v1/auth/sign-in', { email, password })
    } catch {
      return { ok: false, message: UNAVAILABLE }
    }
    if (!response.ok) {
      return {
        ok: false,
        message:
          (await problemDetail(response)) ??
          'Não foi possível entrar. Tente de novo.',
      }
    }
    const parsed = authSessionSchema.safeParse(await response.json())
    if (!parsed.success) return { ok: false, message: UNAVAILABLE }
    await store.set(parsed.data)
    return { ok: true, user: parsed.data.user }
  }

  async function currentUser(): Promise<Me | null> {
    return (await store.get())?.user ?? null
  }

  // Token válido para o cabeçalho Authorization, renovando se preciso. Com a
  // sessão revogada ou vencida, volta ao modo sem conta.
  async function accessToken(): Promise<string | null> {
    const session = await store.get()
    if (!session) return null
    const expiresAt = Date.parse(session.tokens.accessTokenExpiresAt)
    if (expiresAt - now().getTime() > REFRESH_MARGIN_MS) {
      return session.tokens.accessToken
    }

    let response: Response
    try {
      response = await post('/v1/auth/refresh', {
        refreshToken: session.tokens.refreshToken,
      })
    } catch {
      return null
    }
    // Erro do servidor não derruba a sessão: tenta de novo na próxima vez
    if (response.status >= 500) return null
    const parsed = response.ok
      ? authTokensSchema.safeParse(await response.json())
      : null
    if (!parsed?.success) {
      await store.clear()
      return null
    }
    await store.set({ user: session.user, tokens: parsed.data })
    return parsed.data.accessToken
  }

  async function signOut(): Promise<void> {
    const session = await store.get()
    if (!session) return
    try {
      await post('/v1/auth/sign-out', {
        refreshToken: session.tokens.refreshToken,
      })
    } catch {
      // Sem a API, a sessão local sai do mesmo jeito; o refresh token vence
      // sozinho
    }
    await store.clear()
  }

  return { signIn, currentUser, accessToken, signOut }
}

const STORAGE_KEY = 'ufc-flow:session'

export const chromeSessionStore: SessionStore = {
  async get() {
    const stored = await chrome.storage.local.get(STORAGE_KEY)
    return (stored[STORAGE_KEY] as StoredSession | undefined) ?? null
  },
  set: (session) => chrome.storage.local.set({ [STORAGE_KEY]: session }),
  clear: () => chrome.storage.local.remove(STORAGE_KEY),
}
