import type {
  CurriculumImportV1,
  CurriculumImportView,
} from '@ufc-flow/contracts'
import { describe, expect, it, vi } from 'vitest'

import { createFlowApi } from './flow-api'

const API = 'http://api.test'
const ID = '0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10'

export const importView = (
  overrides: Partial<CurriculumImportView> = {},
): CurriculumImportView => ({
  id: ID,
  status: 'APPLIED',
  source: 'EXTENSION',
  pendingReason: null,
  course: {
    sigaaId: '657484',
    name: 'ENGENHARIA DE COMPUTAÇÃO',
    id: ID,
    slug: 'eng',
  },
  curriculum: { code: '2006.2', id: ID },
  subjectCount: 114,
  reviewPointCount: 2,
  importedBy: { id: ID, name: 'Ana' },
  createdAt: '2026-11-01T12:00:00.000Z',
  appliedAt: '2026-11-01T12:00:00.000Z',
  ...overrides,
})

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

function setup(token: string | null, responses: (Response | Error)[]) {
  const fetch = vi.fn<typeof globalThis.fetch>()
  for (const response of responses) {
    if (response instanceof Error) fetch.mockRejectedValueOnce(response)
    else fetch.mockResolvedValueOnce(response)
  }
  const api = createFlowApi({
    apiUrl: API,
    accessToken: async () => token,
    fetch,
  })
  return { api, fetch }
}

const payload = { schemaVersion: 1 } as CurriculumImportV1

describe('sendCurriculum', () => {
  it('envia com Bearer e devolve a importação', async () => {
    const { api, fetch } = setup('tok', [json(201, importView())])
    expect(await api.sendCurriculum(payload)).toEqual({
      ok: true,
      view: importView(),
    })
    const [url, init] = fetch.mock.calls[0]!
    expect(url).toBe(`${API}/v1/ingestion/curriculum-imports`)
    expect(init?.method).toBe('POST')
    const headers = new Headers(init?.headers)
    expect(headers.get('authorization')).toBe('Bearer tok')
    expect(headers.get('content-type')).toBe('application/json')
  })

  it.each([
    ['sem sessão', null, [], 'SIGNED_OUT'],
    ['token recusado', 'tok', [json(401, {})], 'SIGNED_OUT'],
    ['sem permissão', 'tok', [json(403, {})], 'FORBIDDEN'],
    ['erro do servidor', 'tok', [json(500, {})], 'UNAVAILABLE'],
    ['fora do ar', 'tok', [new TypeError('Failed to fetch')], 'UNAVAILABLE'],
    [
      'resposta fora do contrato',
      'tok',
      [json(201, { id: 'x' })],
      'UNAVAILABLE',
    ],
  ])('%s', async (_, token, responses, reason) => {
    const { api } = setup(token, responses as Response[])
    expect(await api.sendCurriculum(payload)).toMatchObject({
      ok: false,
      reason,
    })
  })

  it('arquivo recusado traz o detalhe da API', async () => {
    const { api } = setup('tok', [
      json(400, { detail: 'A matriz não bate com o curso' }),
    ])
    expect(await api.sendCurriculum(payload)).toEqual({
      ok: false,
      reason: 'REJECTED',
      message: 'A matriz não bate com o curso',
    })
    const { api: other } = setup('tok', [new Response('x', { status: 400 })])
    expect(await other.sendCurriculum(payload)).toMatchObject({
      message: 'O Flow recusou o arquivo.',
    })
  })
})

describe('getImport', () => {
  it('busca a situação da importação', async () => {
    const { api, fetch } = setup('tok', [
      json(200, importView({ status: 'RECEIVED' })),
    ])
    expect((await api.getImport(ID))?.status).toBe('RECEIVED')
    expect(fetch.mock.calls[0]![0]).toBe(
      `${API}/v1/ingestion/curriculum-imports/${ID}`,
    )
  })

  it('null quando não dá', async () => {
    expect(await setup(null, []).api.getImport(ID)).toBeNull()
    expect(await setup('tok', [json(404, {})]).api.getImport(ID)).toBeNull()
    expect(await setup('tok', [json(200, {})]).api.getImport(ID)).toBeNull()
    expect(
      await setup('tok', [new TypeError('x')]).api.getImport(ID),
    ).toBeNull()
  })
})

describe('subjectNames', () => {
  const subject = (code: string, name: string) => ({
    id: ID,
    code,
    name,
    type: 'DISCIPLINE',
    durationTerms: 1,
    workloadHours: 64,
    theoryHours: 64,
    labHours: 0,
    eadHours: 0,
    extensionHours: 0,
    credits: 4,
    equivalences: null,
  })

  it('busca em lotes de 300 códigos, sem login', async () => {
    const codes = Array.from(
      { length: 301 },
      (_, index) => `ECO${String(index).padStart(4, '0')}`,
    )
    const { api, fetch } = setup(null, [
      json(200, [subject('ECO0000', 'ALGORITMOS')]),
      json(200, [subject('ECO0300', 'COMPILADORES')]),
    ])
    expect(await api.subjectNames(codes)).toEqual(
      new Map([
        ['ECO0000', 'ALGORITMOS'],
        ['ECO0300', 'COMPILADORES'],
      ]),
    )
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[1]![0] as string).toBe(
      `${API}/v1/subjects?codes=ECO0300`,
    )
  })

  it('null quando a API não responde direito', async () => {
    expect(
      await setup(null, [json(500, {})]).api.subjectNames(['ECO0001']),
    ).toBeNull()
    expect(
      await setup(null, [json(200, [{}])]).api.subjectNames(['ECO0001']),
    ).toBeNull()
    expect(
      await setup(null, [new TypeError('x')]).api.subjectNames(['ECO0001']),
    ).toBeNull()
  })
})

describe('sigaaCourses', () => {
  const entry = (sigaaId: string, removed = false) => ({
    sigaaCourse: {
      sigaaId,
      name: 'ENGENHARIA DE COMPUTAÇÃO',
      city: 'SOBRAL',
      modality: 'IN_PERSON',
      unitAcronym: 'CUFCSOBRAL',
      unitName: 'CAMPUS DA UFC EM SOBRAL',
    },
    flowCourseId: null,
    removed,
  })

  it('devolve os cursos ativos do catálogo', async () => {
    const { api } = setup(null, [json(200, [entry('1'), entry('2', true)])])
    expect((await api.sigaaCourses())?.map((item) => item.sigaaId)).toEqual([
      '1',
    ])
  })

  it('null sem catálogo útil', async () => {
    expect(await setup(null, [json(200, [])]).api.sigaaCourses()).toBeNull()
    expect(await setup(null, [json(503, {})]).api.sigaaCourses()).toBeNull()
    expect(await setup(null, [json(200, [{}])]).api.sigaaCourses()).toBeNull()
    expect(
      await setup(null, [new TypeError('x')]).api.sigaaCourses(),
    ).toBeNull()
  })
})
