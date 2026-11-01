import { readFileSync } from 'node:fs'

import { collectCodes } from '@ufc-flow/academic-core'
import { describe, expect, it } from 'vitest'

import { curriculumImportV1Schema } from './curriculum-import-v1'

// EC real: Engenharia de Computação 2006.2 (Sobral), extraída do HTML do
// SIGAA salvo na extensão antiga, com as vertentes cadastradas no courses.ts
const fixture: unknown = JSON.parse(
  readFileSync(
    new URL(
      '../../fixtures/engenharia-de-computacao-2006-2.json',
      import.meta.url,
    ),
    'utf8',
  ),
)

describe('fixture engenharia-de-computacao-2006-2', () => {
  const result = curriculumImportV1Schema.safeParse(fixture)

  it('passa no CurriculumImportV1', () => {
    expect(result.error?.issues ?? []).toEqual([])
  })

  const data = result.data!

  it('tem todos os componentes da página do SIGAA', () => {
    expect(data.subjects).toHaveLength(114)
    expect(data.branches.map((branch) => branch.key)).toEqual([
      'slope-ciencias-de-computacao',
      'slope-automacao-e-controle',
      'slope-telecomunicacoes',
    ])
  })

  it('preserva o OU dos requisitos', () => {
    const eco0015 = data.subjects.find((item) => item.code === 'ECO0015')
    expect(eco0015?.prerequisites).toEqual({
      kind: 'or',
      items: [
        { kind: 'subject', code: 'ECO0004' },
        { kind: 'subject', code: 'SBL0086' },
      ],
    })
  })

  it('cita nas equivalências disciplinas que não estão na EC', () => {
    const codes = new Set(data.subjects.map((item) => item.code))
    const cited = data.subjects.flatMap((item) =>
      collectCodes(item.equivalences),
    )
    expect(cited.some((code) => !codes.has(code))).toBe(true)
  })
})
