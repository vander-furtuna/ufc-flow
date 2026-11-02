import { describe, expect, it } from 'vitest'

import type { Curriculum } from './curriculum'
import {
  applyIncoming,
  curriculumFromImport,
  diffCurriculum,
  isEmptyDiff,
  planImport,
} from './curriculum-import'
import { aSubject } from './testing/builders'
import { anImport, anImportBranch, anImportSubject } from './testing/imports'

const NOW = new Date('2026-11-01T12:00:00.000Z')

function ids(prefix = 'id') {
  let next = 0
  return () => `${prefix}-${++next}`
}

const fisica = aSubject({ code: 'SBL0074', name: 'FÍSICA GERAL I' })
const calculo = aSubject({
  code: 'SBL0084',
  name: 'CÁLCULO NUMÉRICO',
  equivalences: { kind: 'subject', code: 'CEC0001' },
})
const catalog = new Map([
  [fisica.code, fisica],
  [calculo.code, calculo],
])

const plan = (importedByAdmin: boolean, payload = anImport()) =>
  planImport(payload, {
    catalog,
    importId: 'imp-1',
    importedByAdmin,
    newId: ids('s'),
    now: NOW,
  })

describe('planImport', () => {
  const payload = anImport({
    subjects: [
      anImportSubject({ code: 'SBL0074', name: 'FÍSICA GERAL I (TEORIA)' }),
      anImportSubject({
        code: 'SBL0084',
        name: 'CÁLCULO NUMÉRICO',
        workloadHours: 96,
        labHours: 32,
        credits: 6,
        equivalences: { kind: 'subject', code: 'CEC0002' },
      }),
      anImportSubject({
        code: 'ECO0101',
        name: 'COMPILADORES',
        prerequisites: {
          kind: 'and',
          items: [
            { kind: 'subject', code: 'CEC0058' },
            { kind: 'subject', code: 'SBL0084' },
          ],
        },
        corequisites: { kind: 'subject', code: 'SBL0074' },
        equivalences: { kind: 'subject', code: 'CEC0099' },
      }),
    ],
  })

  it('cria as disciplinas novas e aponta divergências sem sobrescrever', () => {
    const result = plan(false, payload)
    expect(result.newSubjects).toEqual([
      expect.objectContaining({
        id: 's-1',
        code: 'ECO0101',
        name: 'COMPILADORES',
        equivalences: null,
      }),
    ])
    expect(result.reviewPoints.map((point) => point.key)).toEqual([
      'name:SBL0074',
      'workload:SBL0084',
      'equivalences:SBL0084',
      'equivalences:ECO0101',
      'unknown:ECO0101:CEC0058',
    ])
    expect(result.reviewPoints[1]).toMatchObject({
      catalog: { workloadHours: 64, labHours: 0, credits: 4 },
      imported: { workloadHours: 96, labHours: 32, credits: 6 },
    })
    expect(result.reviewPoints[2]).toMatchObject({
      suggested: { kind: 'subject', code: 'CEC0002' },
      current: { kind: 'subject', code: 'CEC0001' },
    })
    expect(result.equivalenceUpdates).toEqual([])
  })

  it('importação de admin aplica as equivalências direto', () => {
    const result = plan(true, payload)
    expect(result.equivalenceUpdates).toEqual([
      { code: 'SBL0084', equivalences: { kind: 'subject', code: 'CEC0002' } },
      { code: 'ECO0101', equivalences: { kind: 'subject', code: 'CEC0099' } },
    ])
    expect(result.reviewPoints.map((point) => point.type)).not.toContain(
      'EQUIVALENCES_SUGGESTED',
    )
  })

  it('moderador sem equivalência no arquivo não sugere apagar', () => {
    const result = plan(
      false,
      anImport({
        subjects: [
          anImportSubject({ code: 'SBL0084', name: 'CÁLCULO NUMÉRICO' }),
        ],
      }),
    )
    expect(result.reviewPoints).toEqual([])
  })
})

const branches = [
  anImportBranch({ key: 'slope-comp', name: 'Computação' }),
  anImportBranch({
    key: 'enf-sis',
    type: 'EMPHASIS',
    name: 'Sistemas',
    sigaaCode: '2023.1E1',
    minHours: 128,
  }),
  anImportBranch({
    key: 'grupo-a',
    parentKey: 'enf-sis',
    type: 'SPECIFIC_GROUP',
    name: 'Grupo A',
    minComponents: 1,
  }),
]

const build = (payload = anImport(), prefix = 'n'): Curriculum =>
  curriculumFromImport(payload, {
    id: 'c-1',
    courseId: 'course-1',
    subjectIdOf: (code) => `s-${code}`,
    newId: ids(prefix),
    now: NOW,
  })

const basePayload = anImport({
  branches,
  subjects: [
    anImportSubject({
      code: 'ECO0001',
      semester: 1,
      branches: [{ key: 'slope-comp', nature: 'MANDATORY' }],
    }),
    anImportSubject({
      code: 'ECO0002',
      semester: 2,
      prerequisites: { kind: 'subject', code: 'ECO0001' },
      branches: [{ key: 'grupo-a', nature: 'OPTATIVE' }],
    }),
  ],
})

describe('curriculumFromImport', () => {
  it('cria o rascunho com UUIDs no lugar das chaves das vertentes', () => {
    const c = build(basePayload)
    expect(c).toMatchObject({
      status: 'DRAFT',
      header: {
        code: '2006.2',
        slug: '2006-2',
        unitName: 'CAMPUS DA UFC EM SOBRAL (11.00.01.28)',
      },
    })
    expect(c.header).not.toHaveProperty('city')
    const [slope, enf, grupo] = c.branches
    expect(grupo?.parentId).toBe(enf?.id)
    expect(c.branches.map((branch) => branch.position)).toEqual([0, 1, 2])
    expect(c.subjects[0]).toMatchObject({
      subjectId: 's-ECO0001',
      branches: [{ branchId: slope?.id, nature: 'MANDATORY' }],
    })
  })
})

describe('diffCurriculum e applyIncoming', () => {
  // EC existente com uma vertente do Flow a mais, que o SIGAA não mostra
  const existing = (): Curriculum => {
    const c = build(basePayload, 'old')
    const flowOnly = {
      ...c.branches[0]!,
      id: 'flow-only',
      name: 'Telecom',
      position: 3,
    }
    return {
      ...c,
      status: 'PUBLISHED',
      branches: [...c.branches, flowOnly],
      subjects: c.subjects.map((item) =>
        item.code === 'ECO0001'
          ? {
              ...item,
              branches: [
                ...item.branches,
                { branchId: 'flow-only', nature: 'OPTATIVE' },
              ],
            }
          : item,
      ),
    }
  }

  it('o mesmo arquivo não muda nada, e a vertente do Flow fica', () => {
    const current = existing()
    const incoming = build(basePayload, 'new')
    expect(isEmptyDiff(diffCurriculum(current, incoming))).toBe(true)
    const applied = applyIncoming(current, incoming, { locked: true })
    expect(applied.branches.map((branch) => branch.id)).toEqual(
      current.branches.map((branch) => branch.id),
    )
    expect(applied.subjects).toEqual(current.subjects)
  })

  const changedPayload = anImport({
    curriculum: { minTotalHours: 3700 },
    branches: [
      anImportBranch({
        key: 'slope-comp',
        name: 'Computação',
        color: '#0891b2',
      }),
      anImportBranch({
        key: 'enf-ia',
        type: 'EMPHASIS',
        name: 'IA',
        sigaaCode: '2023.1E2',
      }),
    ],
    subjects: [
      anImportSubject({
        code: 'ECO0001',
        semester: 2,
        branches: [{ key: 'slope-comp', nature: 'MANDATORY' }],
      }),
      anImportSubject({
        code: 'ECO0003',
        branches: [{ key: 'enf-ia', nature: 'OPTATIVE' }],
      }),
    ],
  })

  it('lista o que muda', () => {
    const diff = diffCurriculum(existing(), build(changedPayload, 'new'))
    expect(diff.header).toEqual([
      { field: 'minTotalHours', before: 3648, after: 3700 },
    ])
    expect(diff.subjects).toEqual({
      added: ['ECO0003'],
      removed: ['ECO0002'],
      changed: [
        {
          key: 'ECO0001',
          fields: [{ field: 'semester', before: 1, after: 2 }],
        },
      ],
    })
    expect(diff.branches).toEqual({
      added: ['IA'],
      removed: ['Sistemas', 'Grupo A'],
      changed: [
        {
          key: 'Computação',
          fields: [{ field: 'color', before: '#22d3ee', after: '#0891b2' }],
        },
      ],
    })
  })

  it('mostra mudança de requisito, natureza, vínculo e vertente-mãe', () => {
    const payload = anImport({
      branches: [
        branches[0]!,
        { ...branches[1]!, name: 'Sistemas de Informação' },
        { ...branches[2]!, parentKey: null },
      ],
      subjects: [
        anImportSubject({
          code: 'ECO0001',
          semester: 1,
          nature: 'OPTATIVE',
          branches: [{ key: 'slope-comp', nature: 'OPTATIVE' }],
        }),
        anImportSubject({
          code: 'ECO0002',
          semester: 2,
          prerequisites: {
            kind: 'or',
            items: [
              { kind: 'subject', code: 'ECO0001' },
              { kind: 'subject', code: 'SBL0084' },
            ],
          },
          corequisites: { kind: 'subject', code: 'ECO0001' },
          branches: [{ key: 'grupo-a', nature: 'OPTATIVE' }],
        }),
      ],
    })
    const diff = diffCurriculum(existing(), build(payload, 'new'))
    expect(diff.subjects.changed).toEqual([
      {
        key: 'ECO0001',
        fields: [
          { field: 'nature', before: 'MANDATORY', after: 'OPTATIVE' },
          {
            field: 'branches',
            before: ['Computação (MANDATORY)', 'Telecom (OPTATIVE)'],
            after: ['Computação (OPTATIVE)', 'Telecom (OPTATIVE)'],
          },
        ],
      },
      {
        key: 'ECO0002',
        fields: [
          {
            field: 'prerequisites',
            before: 'ECO0001',
            after: 'ECO0001 OU SBL0084',
          },
          { field: 'corequisites', before: null, after: 'ECO0001' },
        ],
      },
    ])
    expect(diff.branches.changed).toEqual([
      {
        key: 'Sistemas',
        fields: [
          {
            field: 'name',
            before: 'Sistemas',
            after: 'Sistemas de Informação',
          },
        ],
      },
      {
        key: 'Grupo A',
        fields: [{ field: 'parent', before: 'Sistemas', after: null }],
      },
    ])
  })

  it('aplica antes da 1ª matrícula, mantendo a vertente do Flow', () => {
    const applied = applyIncoming(existing(), build(changedPayload, 'new'), {
      locked: false,
    })
    expect(applied.header.minTotalHours).toBe(3700)
    expect(applied.subjects.map((item) => item.code)).toEqual([
      'ECO0001',
      'ECO0003',
    ])
    expect(applied.branches.map((branch) => branch.name)).toEqual([
      'Computação',
      'Telecom',
      'IA',
    ])
    const eco1 = applied.subjects.find((item) => item.code === 'ECO0001')
    expect(eco1?.branches.map((link) => link.branchId)).toEqual([
      existing().branches[0]!.id,
      'flow-only',
    ])
    expect(eco1?.semester).toBe(2)
  })

  it('mantém o endereço editado da EC (URL antiga) ao reimportar', () => {
    const current = {
      ...existing(),
      header: { ...existing().header, slug: '2005-1' },
    }
    const incoming = build(basePayload, 'new')
    expect(diffCurriculum(current, incoming).header).toEqual([])
    expect(applyIncoming(current, incoming, { locked: true }).header.slug).toBe(
      '2005-1',
    )
  })

  it('depois da 1ª matrícula, as travas da edição manual valem', () => {
    expect(() =>
      applyIncoming(existing(), build(changedPayload, 'new'), { locked: true }),
    ).toThrow(expect.objectContaining({ code: 'CURRICULUM_LOCKED_FIELD' }))
  })
})
