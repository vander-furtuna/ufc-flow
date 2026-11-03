import type { HubDeadline, PostListItem } from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'

import {
  dateRange,
  dayMonth,
  deadlineHint,
  eventDay,
  postChips,
  postDetails,
  publishedLabel,
} from './post-display'

// 10/11/2026, 12h em Fortaleza (UTC-3)
const NOW = new Date('2026-11-10T15:00:00.000Z')

const post = (overrides: Partial<PostListItem> = {}): PostListItem => ({
  id: '1b8f6a3e-2c1d-4f5e-9a7b-3c2d1e0f9a8b',
  courseId: null,
  type: 'NEWS',
  title: 'Laboratório recebe novos kits',
  slug: 'laboratorio-recebe-novos-kits',
  summary: null,
  coverFileId: null,
  externalUrl: null,
  status: 'PUBLISHED',
  pinned: false,
  publishedAt: '2026-11-09T12:00:00.000Z',
  startsAt: null,
  endsAt: null,
  deadlineAt: null,
  location: null,
  attributes: {},
  closed: false,
  author: null,
  createdAt: '2026-11-09T12:00:00.000Z',
  updatedAt: '2026-11-09T12:00:00.000Z',
  ...overrides,
})

describe('datas no fuso de Fortaleza', () => {
  it('dia e mês do instante local, mesmo perto da meia-noite UTC', () => {
    // 01h UTC de 15/11 ainda é 14/11 em Fortaleza
    expect(dayMonth('2026-11-15T01:00:00.000Z')).toBe('14/11')
  })

  it.each([
    ['2026-11-18T13:00:00.000Z', null, '18/11'],
    ['2026-11-18T13:00:00.000Z', '2026-11-18T20:00:00.000Z', '18/11'],
    ['2026-11-18T13:00:00.000Z', '2026-11-22T20:00:00.000Z', '18 a 22/11'],
    ['2026-11-30T13:00:00.000Z', '2026-12-02T20:00:00.000Z', '30/11 a 02/12'],
  ])('intervalo %s até %s', (start, end, expected) => {
    expect(dateRange(start, end)).toBe(expected)
  })

  it('caixinha do evento com mês abreviado', () => {
    expect(
      eventDay(post({ type: 'EVENT', startsAt: '2026-11-18T13:00:00.000Z' })),
    ).toEqual({ month: 'NOV', day: '18' })
    expect(eventDay(post())).toBeNull()
  })
})

describe('publishedLabel', () => {
  it.each([
    ['2026-11-10T13:00:00.000Z', 'Publicado hoje'],
    ['2026-11-09T12:00:00.000Z', 'Publicado há 1 dia'],
    ['2026-11-07T12:00:00.000Z', 'Publicado há 3 dias'],
    ['2026-11-03T12:00:00.000Z', 'Publicado há 1 semana'],
    ['2026-10-20T12:00:00.000Z', 'Publicado há 3 semanas'],
    ['2026-09-01T12:00:00.000Z', 'Publicado em 01/09/2026'],
  ])('publicado em %s', (publishedAt, expected) => {
    expect(publishedLabel(post({ publishedAt }), NOW)).toBe(expected)
  })

  it('encerrado mostra o prazo; rascunho e arquivado, a última edição', () => {
    expect(
      publishedLabel(
        post({
          type: 'CALL',
          closed: true,
          deadlineAt: '2026-10-20T23:00:00.000Z',
        }),
        NOW,
      ),
    ).toBe('Encerrado em 20/10')
    expect(
      publishedLabel(post({ status: 'DRAFT', publishedAt: null }), NOW),
    ).toBe('Atualizado em 09/11')
    expect(publishedLabel(post({ status: 'ARCHIVED' }), NOW)).toBe(
      'Atualizado em 09/11',
    )
  })
})

describe('postChips', () => {
  it('evento: período, local e modalidade', () => {
    expect(
      postChips(
        post({
          type: 'EVENT',
          startsAt: '2026-11-18T13:00:00.000Z',
          endsAt: '2026-11-22T20:00:00.000Z',
          location: 'Bloco didático',
          attributes: { modality: 'IN_PERSON' },
        }),
      ),
    ).toEqual(['18 a 22/11', 'Bloco didático', 'Presencial'])
  })

  it('bolsa: valor, vagas, carga e prazo', () => {
    expect(
      postChips(
        post({
          type: 'SCHOLARSHIP',
          deadlineAt: '2026-11-08T02:59:00.000Z',
          attributes: { amountBrl: 700, vacancies: 2, weeklyHours: 20 },
        }),
      ),
    ).toEqual(['R$ 700/mês', '2 vagas', '20 h/semana', 'Prazo 07/11'])
    expect(
      postChips(
        post({
          type: 'SCHOLARSHIP',
          deadlineAt: '2026-11-08T02:59:00.000Z',
          attributes: { amountBrl: 412.5, vacancies: 1 },
        }),
      ),
    ).toEqual(['R$ 412,50/mês', '1 vaga', 'Prazo 07/11'])
  })

  it('extensão e edital', () => {
    expect(
      postChips(
        post({
          type: 'EXTENSION_PROJECT',
          attributes: { vacancies: 6, contact: 'Contato no SIGAA' },
        }),
      ),
    ).toEqual(['6 vagas', 'Contato no SIGAA'])
    expect(
      postChips(
        post({
          type: 'CALL',
          deadlineAt: '2026-11-15T02:59:00.000Z',
          attributes: { number: '12/2026', issuer: 'Coordenação' },
        }),
      ),
    ).toEqual(['Prazo 14/11', 'Edital nº 12/2026 · Coordenação'])
  })

  it('encerrado vira um chip só; notícia sem nada', () => {
    expect(
      postChips(
        post({
          type: 'CALL',
          closed: true,
          deadlineAt: '2026-10-20T23:00:00.000Z',
        }),
      ),
    ).toEqual(['Encerrado'])
    expect(postChips(post())).toEqual([])
  })
})

describe('deadlineHint', () => {
  const deadline = (overrides: Partial<HubDeadline>): HubDeadline => ({
    postId: '1b8f6a3e-2c1d-4f5e-9a7b-3c2d1e0f9a8b',
    slug: 'bolsa',
    type: 'SCHOLARSHIP',
    title: 'Bolsa de iniciação científica',
    at: '2026-11-18T02:59:00.000Z',
    endsAt: null,
    ...overrides,
  })

  it.each([
    ['2026-11-11T02:59:00.000Z', 'Encerra hoje', true],
    ['2026-11-12T02:59:00.000Z', 'Encerra amanhã', true],
    ['2026-11-18T02:59:00.000Z', 'Encerra em 7 dias', true],
    ['2026-11-30T02:59:00.000Z', 'Bolsa', false],
  ])('prazo %s', (at, text, urgent) => {
    expect(deadlineHint(deadline({ at }), NOW)).toEqual({ text, urgent })
  })

  it('evento mostra o período', () => {
    expect(
      deadlineHint(
        deadline({
          type: 'EVENT',
          at: '2026-11-18T13:00:00.000Z',
          endsAt: '2026-11-22T20:00:00.000Z',
        }),
        NOW,
      ),
    ).toEqual({ text: 'Evento · 18 a 22/11', urgent: false })
  })
})

describe('postDetails', () => {
  it('evento no mesmo dia mostra o horário; com inscrição, o link', () => {
    expect(
      postDetails(
        post({
          type: 'EVENT',
          startsAt: '2026-11-18T17:00:00.000Z',
          endsAt: '2026-11-18T20:00:00.000Z',
          location: 'Auditório',
          attributes: {
            modality: 'HYBRID',
            registrationUrl: 'https://ufc.br/inscricao',
          },
        }),
      ),
    ).toEqual([
      { label: 'Quando', value: '18/11, 14:00 às 17:00' },
      { label: 'Local', value: 'Auditório' },
      { label: 'Modalidade', value: 'Híbrido' },
      {
        label: 'Inscrição',
        value: 'Fazer inscrição',
        href: 'https://ufc.br/inscricao',
      },
    ])
  })

  it('edital com prazo completo e documento', () => {
    expect(
      postDetails(
        post({
          type: 'CALL',
          deadlineAt: '2026-11-15T02:59:00.000Z',
          attributes: { number: '12/2026', documentUrl: 'https://ufc.br/e' },
        }),
      ),
    ).toEqual([
      { label: 'Prazo', value: '14/11/2026, 23:59' },
      { label: 'Número', value: '12/2026' },
      { label: 'Documento', value: 'Abrir o edital', href: 'https://ufc.br/e' },
    ])
  })

  it('bolsa com valor e carga por extenso', () => {
    expect(
      postDetails(
        post({
          type: 'SCHOLARSHIP',
          deadlineAt: '2026-11-08T02:59:00.000Z',
          attributes: { amountBrl: 700, weeklyHours: 20, sponsor: 'FUNCAP' },
        }),
      ).map((row) => row.value),
    ).toEqual([
      '07/11/2026, 23:59',
      'R$ 700 por mês',
      '20 h por semana',
      'FUNCAP',
    ])
  })
})
