import { readFileSync } from 'node:fs'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  HttpSigaaCourseSource,
  parseSigaaCourseList,
  SIGAA_COURSE_LIST_URL,
} from './sigaa-course-list'

const fixture = readFileSync(
  new URL('./__fixtures__/lista-cursos.html', import.meta.url),
)
const html = new TextDecoder('windows-1252').decode(fixture)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parseSigaaCourseList', () => {
  it('lê código, nome, cidade, modalidade e unidade', () => {
    const courses = parseSigaaCourseList(html)
    expect(courses).toHaveLength(6)
    expect(courses[0]).toEqual({
      sigaaId: '1912104',
      name: 'CIÊNCIA DA COMPUTAÇÃO',
      city: 'RUSSAS',
      modality: 'IN_PERSON',
      unitAcronym: 'CAMPRUSSAS',
      unitName: 'CAMPUS DA UFC DE RUSSAS',
    })
    expect(
      courses.find((item) => item.name === 'ENGENHARIA DE COMPUTAÇÃO'),
    ).toMatchObject({
      city: 'SOBRAL',
      unitAcronym: 'CUFCSOBRAL',
    })
    expect(courses.filter((item) => item.modality === 'DISTANCE')).toHaveLength(
      2,
    )
  })

  it('não guarda o coordenador', () => {
    expect(JSON.stringify(parseSigaaCourseList(html))).not.toContain('COORDENA')
  })

  it('página sem tabela não tem cursos', () => {
    expect(
      parseSigaaCourseList('<html><body>manutenção</body></html>'),
    ).toEqual([])
  })
})

describe('HttpSigaaCourseSource', () => {
  const respond = (
    body: ConstructorParameters<typeof Response>[0],
    status = 200,
  ) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(body, { status })),
    )

  it('busca a lista e decodifica windows-1252', async () => {
    respond(fixture)
    const courses = await new HttpSigaaCourseSource().fetchAll()
    expect(courses[0]?.name).toBe('CIÊNCIA DA COMPUTAÇÃO')
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(SIGAA_COURSE_LIST_URL)
  })

  it('erro do SIGAA ou lista vazia não apagam o catálogo', async () => {
    respond('erro', 503)
    await expect(new HttpSigaaCourseSource().fetchAll()).rejects.toThrow('503')
    respond('<html></html>')
    await expect(new HttpSigaaCourseSource().fetchAll()).rejects.toThrow(
      'vazia',
    )
  })
})
