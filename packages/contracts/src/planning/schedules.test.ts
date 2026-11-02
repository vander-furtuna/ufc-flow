import { describe, expect, it } from 'vitest'

import {
  SCHEDULE_MAX_ITEMS,
  scheduleImportInputSchema,
  scheduleInputSchema,
  scheduleListQuerySchema,
} from './schedules'

const ID = '0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10'

const input = {
  courseSlug: 'engenharia-de-computacao',
  curriculumSlug: '2006-2',
  term: '2026.2',
  name: ' Minha agenda ',
  items: [{ sectionId: ID, color: 'blue' }],
}

describe('agenda', () => {
  it('aceita a agenda inteira, limpa o nome e põe a posição 0', () => {
    expect(scheduleInputSchema.parse(input)).toEqual({
      ...input,
      name: 'Minha agenda',
      position: 0,
    })
  })

  it('recusa nome vazio, cor fora da paleta, termo inválido e itens demais', () => {
    expect(
      scheduleInputSchema.safeParse({ ...input, name: '  ' }).success,
    ).toBe(false)
    expect(
      scheduleInputSchema.safeParse({
        ...input,
        items: [{ sectionId: ID, color: 'fuschia' }],
      }).success,
    ).toBe(false)
    expect(
      scheduleInputSchema.safeParse({ ...input, term: '2026.3' }).success,
    ).toBe(false)
    expect(
      scheduleInputSchema.safeParse({
        ...input,
        items: Array.from({ length: SCHEDULE_MAX_ITEMS + 1 }, () => ({
          sectionId: ID,
          color: 'red',
        })),
      }).success,
    ).toBe(false)
  })

  it('filtros da listagem são opcionais', () => {
    expect(scheduleListQuerySchema.parse({})).toEqual({})
    expect(scheduleListQuerySchema.safeParse({ term: '2026-2' }).success).toBe(
      false,
    )
  })
})

describe('importação', () => {
  it('aceita agendas locais com turmas pela chave natural', () => {
    expect(
      scheduleImportInputSchema.safeParse({
        schedules: [
          {
            id: ID,
            courseSlug: 'musica',
            curriculumSlug: '2020-1',
            term: '2026.2',
            name: 'Agenda 1',
            items: [
              { subjectCode: 'SBL0056', sectionCode: '01A', color: 'rose' },
            ],
          },
        ],
      }).success,
    ).toBe(true)
  })

  it('recusa importação vazia e id que não é UUID', () => {
    expect(scheduleImportInputSchema.safeParse({ schedules: [] }).success).toBe(
      false,
    )
    expect(
      scheduleImportInputSchema.safeParse({
        schedules: [{ ...input, id: 'local-1', items: [] }],
      }).success,
    ).toBe(false)
  })
})
