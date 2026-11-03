import type { PostView } from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'

import {
  emptyPostForm,
  fromLocalInput,
  postFormFromView,
  toLocalInput,
  validatePostForm,
} from './post-form'

describe('datas do formulário em Fortaleza', () => {
  it('converte o datetime-local de ida e volta', () => {
    expect(fromLocalInput('2026-11-14T23:59')).toBe('2026-11-15T02:59:00.000Z')
    expect(toLocalInput('2026-11-15T02:59:00.000Z')).toBe('2026-11-14T23:59')
    expect(fromLocalInput('')).toBeNull()
    expect(toLocalInput(null)).toBe('')
  })
})

describe('validatePostForm', () => {
  it('bolsa válida vira o PostInput com os atributos numéricos', () => {
    const result = validatePostForm({
      ...emptyPostForm('SCHOLARSHIP'),
      title: 'Bolsa de iniciação científica',
      bodyMd: 'Projeto no **laboratório**.',
      deadlineAt: '2026-11-07T23:59',
      attributes: {
        amountBrl: '700,50',
        vacancies: '2',
        weeklyHours: '',
        sponsor: ' FUNCAP ',
      },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.input).toMatchObject({
      type: 'SCHOLARSHIP',
      summary: null,
      status: 'PUBLISHED',
      deadlineAt: '2026-11-08T02:59:00.000Z',
      startsAt: null,
      attributes: { amountBrl: 700.5, vacancies: 2, sponsor: 'FUNCAP' },
    })
  })

  it('sem o prazo obrigatório, aponta o campo', () => {
    const result = validatePostForm({
      ...emptyPostForm('CALL'),
      title: 'Edital',
      bodyMd: 'Texto',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Object.keys(result.errors)).toEqual(['deadlineAt'])
  })

  it('término antes do início e vagas que não são número', () => {
    const result = validatePostForm({
      ...emptyPostForm('EVENT'),
      title: 'Semana',
      bodyMd: 'Texto',
      startsAt: '2026-11-18T08:00',
      endsAt: '2026-11-17T08:00',
    })
    expect(result.ok || result.errors.endsAt).toBe(
      'O término não pode ser antes do início',
    )

    const project = validatePostForm({
      ...emptyPostForm('EXTENSION_PROJECT'),
      title: 'Programação nas escolas',
      bodyMd: 'Texto',
      attributes: { vacancies: 'seis' },
    })
    expect(project.ok || project.errors['attributes.vacancies']).toBe(
      'Use um número inteiro',
    )
  })

  it('descarta os atributos de outro tipo ao trocar o tipo', () => {
    const result = validatePostForm({
      ...emptyPostForm('NEWS'),
      title: 'Notícia',
      bodyMd: 'Texto',
      attributes: { vacancies: '6' },
    })
    expect(result.ok && result.input.attributes).toEqual({})
  })
})

describe('postFormFromView', () => {
  it('carrega o post para edição', () => {
    const view = {
      id: '1b8f6a3e-2c1d-4f5e-9a7b-3c2d1e0f9a8b',
      courseId: null,
      type: 'EVENT',
      title: 'Semana',
      slug: 'semana',
      summary: null,
      bodyMd: 'Texto',
      coverFileId: null,
      imageFileIds: [],
      externalUrl: null,
      status: 'DRAFT',
      pinned: true,
      publishedAt: null,
      startsAt: '2026-11-18T11:00:00.000Z',
      endsAt: null,
      deadlineAt: null,
      location: 'Bloco didático',
      attributes: { modality: 'HYBRID' },
      closed: false,
      author: null,
      createdAt: '2026-11-09T12:00:00.000Z',
      updatedAt: '2026-11-09T12:00:00.000Z',
    } satisfies PostView
    expect(postFormFromView(view)).toMatchObject({
      type: 'EVENT',
      summary: '',
      startsAt: '2026-11-18T08:00',
      endsAt: '',
      location: 'Bloco didático',
      pinned: true,
      status: 'DRAFT',
      attributes: { modality: 'HYBRID' },
    })
  })
})
