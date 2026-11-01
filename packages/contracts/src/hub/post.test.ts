import { describe, expect, it } from 'vitest'

import { postInputSchema } from './post'

const base = {
  title: 'Semana da Computação',
  summary: null,
  bodyMd: 'Programação completa no site.',
  coverFileId: null,
  externalUrl: null,
  status: 'PUBLISHED',
  pinned: false,
  startsAt: null,
  endsAt: null,
  deadlineAt: null,
  location: null,
} as const

const examples = {
  NEWS: { ...base, type: 'NEWS', attributes: {} },
  EVENT: {
    ...base,
    type: 'EVENT',
    startsAt: '2026-11-10T19:00:00-03:00',
    endsAt: '2026-11-10T22:00:00-03:00',
    location: 'Auditório do bloco 1',
    attributes: {
      modality: 'HYBRID',
      registrationUrl: 'https://forms.example.com/semana',
    },
  },
  SCHOLARSHIP: {
    ...base,
    type: 'SCHOLARSHIP',
    deadlineAt: '2026-11-20T23:59:00-03:00',
    attributes: {
      amountBrl: 700,
      vacancies: 2,
      weeklyHours: 12,
      sponsor: 'PREX',
      requirements: 'Ter cursado Estruturas de Dados',
    },
  },
  EXTENSION_PROJECT: {
    ...base,
    type: 'EXTENSION_PROJECT',
    attributes: { coordinator: 'Profa. Ana', vacancies: 5 },
  },
  CALL: {
    ...base,
    type: 'CALL',
    deadlineAt: '2026-12-01T23:59:00-03:00',
    attributes: {
      number: '12/2026',
      issuer: 'PROGRAD',
      documentUrl: 'https://prograd.ufc.br/edital-12-2026.pdf',
    },
  },
}

const pathsOf = (value: unknown) =>
  postInputSchema.safeParse(value).error?.issues.map((issue) => issue.path)

describe('postInputSchema', () => {
  it.each(Object.entries(examples))('aceita %s', (_, value) => {
    expect(postInputSchema.parse(value)).toEqual(value)
  })

  it('recusa tipo desconhecido', () => {
    expect(postInputSchema.safeParse({ ...base, type: 'AD' }).success).toBe(
      false,
    )
  })

  it('evento exige startsAt', () => {
    expect(pathsOf({ ...examples.EVENT, startsAt: null })).toEqual([
      ['startsAt'],
    ])
  })

  it.each(['SCHOLARSHIP', 'CALL'] as const)('%s exige deadlineAt', (type) => {
    expect(pathsOf({ ...examples[type], deadlineAt: null })).toEqual([
      ['deadlineAt'],
    ])
  })

  it('recusa atributo de outro tipo ou com tipo errado', () => {
    expect(
      pathsOf({ ...examples.NEWS, attributes: { modality: 'ONLINE' } }),
    ).toEqual([['attributes']])
    expect(
      pathsOf({
        ...examples.SCHOLARSHIP,
        attributes: { amountBrl: -1, vacancies: 1.5 },
      }),
    ).toEqual([
      ['attributes', 'amountBrl'],
      ['attributes', 'vacancies'],
    ])
  })

  it('recusa término antes do início', () => {
    expect(
      pathsOf({ ...examples.EVENT, endsAt: '2026-11-10T18:00:00-03:00' }),
    ).toEqual([['endsAt']])
  })

  it('aceita término sem início em tipos que não exigem início', () => {
    expect(
      postInputSchema.safeParse({
        ...examples.EXTENSION_PROJECT,
        endsAt: '2026-12-15T00:00:00Z',
      }).success,
    ).toBe(true)
  })

  it('exige título e corpo', () => {
    expect(pathsOf({ ...examples.NEWS, title: ' ', bodyMd: '' })).toEqual([
      ['title'],
      ['bodyMd'],
    ])
  })
})
