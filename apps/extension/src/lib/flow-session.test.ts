import type { AuthSession } from '@ufc-flow/contracts'
import { describe, expect, it, vi } from 'vitest'

import {
  chromeSessionStore,
  createFlowClient,
  type SessionStore,
  type StoredSession,
} from './flow-session'

const API = 'http://api.test'
const NOW = new Date('2026-11-01T12:00:00.000Z')

const tokens = (accessExpiresAt: string, suffix = '1') => ({
  tokenType: 'Bearer' as const,
  accessToken: `access-${suffix}`,
  accessTokenExpiresAt: accessExpiresAt,
  refreshToken: `refresh-${suffix}`,
  refreshTokenExpiresAt: '2026-12-01T12:00:00.000Z',
})

const session = (
  accessExpiresAt = '2026-11-01T12:15:00.000Z',
): AuthSession => ({
  user: {
    id: '0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10',
    name: 'Ana Moderadora',
    email: 'ana@alu.ufc.br',
    status: 'ACTIVE',
    roles: [],
    moderatedCourses: [],
    avatarFileId: null,
    createdAt: '2026-10-01T12:00:00.000Z',
  },
  tokens: tokens(accessExpiresAt),
})

function memoryStore(initial: StoredSession | null = null) {
  let value = initial
  const store: SessionStore = {
    get: async () => value,
    set: async (next) => {
      value = next
    },
    clear: async () => {
      value = null
    },
  }
  return { store, current: () => value }
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const problem = (status: number, code: string, detail: string) =>
  json(status, { type: 'about:blank', title: code, status, code, detail })

function setup(initial: StoredSession | null, responses: Response[]) {
  const memory = memoryStore(initial)
  const fetch = vi.fn<typeof globalThis.fetch>()
  for (const response of responses) fetch.mockResolvedValueOnce(response)
  const client = createFlowClient({
    apiUrl: API,
    store: memory.store,
    fetch,
    now: () => NOW,
  })
  return { client, fetch, ...memory }
}

const bodyOf = (call: Parameters<typeof globalThis.fetch>) =>
  JSON.parse(call[1]?.body as string) as unknown

describe('signIn', () => {
  it('guarda a sessão quando a API aceita', async () => {
    const { client, fetch, current } = setup(null, [json(200, session())])

    const result = await client.signIn('ana@alu.ufc.br', 'senha-boa-123')

    expect(result).toEqual({ ok: true, user: session().user })
    expect(current()).toEqual(session())
    const [url, init] = fetch.mock.calls[0]!
    expect(url).toBe(`${API}/v1/auth/sign-in`)
    expect(init?.method).toBe('POST')
    expect(bodyOf(fetch.mock.calls[0]!)).toEqual({
      email: 'ana@alu.ufc.br',
      password: 'senha-boa-123',
    })
  })

  it('devolve a mensagem da API e não guarda nada quando recusa', async () => {
    const { client, current } = setup(null, [
      problem(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos'),
    ])

    const result = await client.signIn('ana@alu.ufc.br', 'errada-123')

    expect(result).toEqual({ ok: false, message: 'E-mail ou senha incorretos' })
    expect(current()).toBeNull()
  })

  it('avisa quando a API não responde', async () => {
    const { client, fetch } = setup(null, [])
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    expect(await client.signIn('ana@alu.ufc.br', 'senha-boa-123')).toEqual({
      ok: false,
      message: 'Não foi possível falar com o Flow. Tente de novo.',
    })
  })

  it('trata resposta fora do contrato como falha', async () => {
    const { client, current } = setup(null, [json(200, { user: {} })])

    const result = await client.signIn('ana@alu.ufc.br', 'senha-boa-123')

    expect(result.ok).toBe(false)
    expect(current()).toBeNull()
  })

  it('usa uma mensagem genérica quando o erro não tem detalhe', async () => {
    const { client } = setup(null, [new Response('oops', { status: 500 })])

    expect(await client.signIn('ana@alu.ufc.br', 'senha-boa-123')).toEqual({
      ok: false,
      message: 'Não foi possível entrar. Tente de novo.',
    })
  })
})

describe('currentUser', () => {
  it('lê o usuário guardado', async () => {
    const { client } = setup(session(), [])
    expect(await client.currentUser()).toEqual(session().user)
  })

  it('devolve null sem sessão', async () => {
    const { client } = setup(null, [])
    expect(await client.currentUser()).toBeNull()
  })
})

describe('accessToken', () => {
  it('usa o token guardado enquanto ele vale', async () => {
    const { client, fetch } = setup(session(), [])

    expect(await client.accessToken()).toBe('access-1')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('renova perto do vencimento e guarda os tokens novos', async () => {
    const expiring = session('2026-11-01T12:00:20.000Z')
    const renewed = tokens('2026-11-01T12:15:00.000Z', '2')
    const { client, fetch, current } = setup(expiring, [json(200, renewed)])

    expect(await client.accessToken()).toBe('access-2')
    expect(fetch.mock.calls[0]![0]).toBe(`${API}/v1/auth/refresh`)
    expect(bodyOf(fetch.mock.calls[0]!)).toEqual({ refreshToken: 'refresh-1' })
    expect(current()).toEqual({ user: expiring.user, tokens: renewed })
  })

  it('apaga a sessão quando a API recusa o refresh token', async () => {
    const { client, current } = setup(session('2026-11-01T11:00:00.000Z'), [
      problem(401, 'REFRESH_TOKEN_REUSED', 'Sessão encerrada'),
    ])

    expect(await client.accessToken()).toBeNull()
    expect(current()).toBeNull()
  })

  it('mantém a sessão quando a API está fora do ar', async () => {
    const expired = session('2026-11-01T11:00:00.000Z')
    const { client, fetch, current } = setup(expired, [])
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    expect(await client.accessToken()).toBeNull()
    expect(current()).toEqual(expired)
  })

  it('mantém a sessão quando a API falha com erro do servidor', async () => {
    const expired = session('2026-11-01T11:00:00.000Z')
    const { client, current } = setup(expired, [
      new Response('oops', { status: 503 }),
    ])

    expect(await client.accessToken()).toBeNull()
    expect(current()).toEqual(expired)
  })

  it('devolve null sem sessão', async () => {
    const { client } = setup(null, [])
    expect(await client.accessToken()).toBeNull()
  })
})

describe('chromeSessionStore', () => {
  it('guarda, lê e apaga em chrome.storage.local', async () => {
    const data: Record<string, unknown> = {}
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => (key in data ? { [key]: data[key] } : {}),
          set: async (items: Record<string, unknown>) => {
            Object.assign(data, items)
          },
          remove: async (key: string) => {
            delete data[key]
          },
        },
      },
    })

    expect(await chromeSessionStore.get()).toBeNull()
    await chromeSessionStore.set(session())
    expect(await chromeSessionStore.get()).toEqual(session())
    await chromeSessionStore.clear()
    expect(await chromeSessionStore.get()).toBeNull()
    vi.unstubAllGlobals()
  })
})

describe('signOut', () => {
  it('revoga a sessão na API e apaga a local', async () => {
    const { client, fetch, current } = setup(session(), [
      new Response(null, { status: 204 }),
    ])

    await client.signOut()

    expect(fetch.mock.calls[0]![0]).toBe(`${API}/v1/auth/sign-out`)
    expect(bodyOf(fetch.mock.calls[0]!)).toEqual({ refreshToken: 'refresh-1' })
    expect(current()).toBeNull()
  })

  it('apaga a sessão local mesmo com a API fora do ar', async () => {
    const { client, fetch, current } = setup(session(), [])
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await client.signOut()

    expect(current()).toBeNull()
  })

  it('não chama a API sem sessão', async () => {
    const { client, fetch } = setup(null, [])
    await client.signOut()
    expect(fetch).not.toHaveBeenCalled()
  })
})
