import { curriculumImportV1Schema } from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'

import { legacyToImport, loadLegacyCourses } from './legacy-courses'

const courses = await loadLegacyCourses()
const AT = '2026-11-01T12:00:00.000Z'

describe('legacyToImport', () => {
  it('converte as 9 ECs do courses.ts em arquivos válidos', () => {
    const files = courses.flatMap((course) =>
      course.curriculumStructures.map((curriculum) =>
        legacyToImport(course, curriculum, null, AT),
      ),
    )
    expect(files).toHaveLength(9)
    for (const file of files) {
      const result = curriculumImportV1Schema.safeParse(file)
      expect(result.error?.issues.slice(0, 3) ?? []).toEqual([])
    }
  })

  it('lista vira E de todos os códigos e a natureza do front vira MANDATORY ou OPTATIVE', () => {
    const [course] = courses
    const file = legacyToImport(
      course!,
      course!.curriculumStructures[0]!,
      { name: 'ENGENHARIA DE COMPUTAÇÃO', unitName: 'CAMPUS DA UFC EM SOBRAL' },
      AT,
    )
    expect(file.course).toEqual({
      sigaaId: course!.id,
      name: 'ENGENHARIA DE COMPUTAÇÃO',
      recognition: 'MANUAL',
    })
    const withMany = file.subjects.find(
      (subject) => subject.prerequisites?.kind === 'and',
    )
    expect(withMany?.prerequisites).toMatchObject({ kind: 'and' })
    expect(new Set(file.subjects.map((subject) => subject.nature))).toEqual(
      new Set(['MANDATORY', 'OPTATIVE']),
    )
    expect(file.curriculum.matrixName).toBe('ENGENHARIA DE COMPUTAÇÃO - SOBRAL')
  })
})
