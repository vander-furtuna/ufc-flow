import { describe, expect, it } from 'vitest'

import { loadFixture } from '../sigaa/test-utils'
import { importFileName, importJson } from './download'
import { extractCurriculum } from './extraction'

describe('download do JSON', () => {
  const data = extractCurriculum({
    doc: loadFixture('estrutura-engenharia-de-computacao-2006-2.html'),
    search: { selectedCourseId: null, courses: [], curriculum: null },
    manualCourseId: null,
    now: new Date('2026-11-01T12:00:00Z'),
    url: null,
  })!.data!

  it('nomeia o arquivo pelo curso e pelo código da EC', () => {
    expect(importFileName(data)).toBe('engenharia-de-computacao-2006-2.json')
  })

  it('gera o JSON indentado, que volta ao mesmo objeto', () => {
    expect(JSON.parse(importJson(data))).toEqual(data)
    expect(importJson(data)).toContain('\n  "schemaVersion": 1,')
  })
})
