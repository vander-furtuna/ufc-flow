import { readFileSync } from 'node:fs'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpSigaaSectionSource, parseSigaaSections } from './sigaa-sections'

const html = readFileSync(
  new URL('./__fixtures__/turmas.html', import.meta.url),
  'utf8',
)

describe('parseSigaaSections', () => {
  const sections = parseSigaaSections(html)
  const find = (subject: string, section: string) =>
    sections.find(
      (item) => item.subjectCode === subject && item.sectionCode === section,
    )

  it('lê disciplina, turma, docente, vagas e horário', () => {
    expect(sections).toHaveLength(9)
    expect(find('SBL0056', '01')).toEqual({
      subjectCode: 'SBL0056',
      subjectName: 'ÁLGEBRA LINEAR',
      sectionCode: '01',
      instructors: [
        {
          siape: '9000001',
          name: 'DOCENTE 1',
          profileUrl: '/sigaa/public/docente/portal.jsf?siape=9000001',
        },
      ],
      reservedSeats: 60,
      slots: [
        { weekday: 1, startTime: '08:00', endTime: '10:00' },
        { weekday: 3, startTime: '08:00', endTime: '10:00' },
      ],
      validFrom: '2026-08-10',
      validTo: '2026-12-11',
    })
  })

  it('dois docentes e aula partida no mesmo dia', () => {
    const section = find('SBL0082', '01B')!
    expect(section.instructors.map((item) => item.siape)).toEqual([
      '9000004',
      '9000005',
    ])
    expect(
      section.slots.map((slot) => `${slot.weekday} ${slot.startTime}`),
    ).toEqual(['3 13:30', '5 08:00', '5 13:30'])
  })

  it('internato com blocos de datas: docente sem repetição e vigência total', () => {
    const section = find('MS1105', '01')!
    expect(section.instructors).toHaveLength(1)
    expect(section.slots).toHaveLength(3)
    expect([section.validFrom, section.validTo]).toEqual([
      '2026-11-30',
      '2026-12-11',
    ])
  })

  it('aula de sábado', () => {
    expect(find('MSC0117', '01')!.slots).toContainEqual({
      weekday: 6,
      startTime: '07:00',
      endTime: '11:00',
    })
  })

  it('página sem tabelas não tem turmas', () => {
    expect(parseSigaaSections('<div id="turmasAbertas"></div>')).toEqual([])
  })
})

describe('HttpSigaaSectionSource', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const formPage = `<form id="form">
    <input type="hidden" name="form" value="form" />
    <input type="hidden" name="form:id" value="657484" />
    <input type="text" name="form:inputAno" value="2026" />
    <select name="form:inputPeriodo"><option value="1" selected>1</option></select>
    <input type="submit" name="form:j_id_jsp_1_40" value="Buscar" />
    <input type="submit" name="form:cancelar" value="Cancelar" />
    <input type="hidden" name="javax.faces.ViewState" value="j_id9" />
  </form>`

  function stub(...responses: Response[]) {
    const fetch = vi.fn()
    for (const response of responses) fetch.mockResolvedValueOnce(response)
    vi.stubGlobal('fetch', fetch)
    return fetch
  }

  it('envia o formulário com o semestre, o cookie e o botão Buscar', async () => {
    const fetch = stub(
      new Response(formPage, {
        headers: {
          'set-cookie': 'JSESSIONID=abc; Path=/sigaa',
          'content-type': 'text/html;charset=UTF-8',
        },
      }),
      new Response(html, { headers: { 'content-type': 'text/html' } }),
    )
    const sections = await new HttpSigaaSectionSource().fetch('657484', 2026, 2)
    expect(sections).toHaveLength(9)
    const [url, init] = fetch.mock.calls[1]!
    expect(url).toContain('id=657484')
    expect(init.headers.cookie).toBe('JSESSIONID=abc')
    const body = init.body as URLSearchParams
    expect(Object.fromEntries(body)).toEqual({
      form: 'form',
      'form:id': '657484',
      'form:inputAno': '2026',
      'form:inputPeriodo': '2',
      'form:j_id_jsp_1_40': 'Buscar',
      'javax.faces.ViewState': 'j_id9',
    })
  })

  it('falha com erro HTTP, sem formulário ou sem a lista', async () => {
    const source = new HttpSigaaSectionSource()
    stub(new Response('', { status: 503 }))
    await expect(source.fetch('1', 2026, 2)).rejects.toThrow('503')
    stub(new Response('<html></html>'))
    await expect(source.fetch('1', 2026, 2)).rejects.toThrow('formulário')
    stub(new Response(formPage), new Response('', { status: 500 }))
    await expect(source.fetch('1', 2026, 2)).rejects.toThrow('500')
    stub(new Response(formPage), new Response('<p>Erro</p>'))
    await expect(source.fetch('1', 2026, 2)).rejects.toThrow('sem a lista')
  })

  it('semestre sem turmas volta só com o formulário', async () => {
    stub(new Response(formPage), new Response(formPage))
    expect(await new HttpSigaaSectionSource().fetch('1', 2027, 2)).toEqual([])
  })
})
