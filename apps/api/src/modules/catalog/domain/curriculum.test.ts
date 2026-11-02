import type { PublicationCheck } from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'

import {
  addSubject,
  createBranch,
  markCurrent,
  publish,
  removeBranch,
  removeSubject,
  setBranchSubjects,
  updateBranch,
  updateHeader,
  updateSubject,
  type Branch,
  type Curriculum,
  type CurriculumSubject,
} from './curriculum'
import { aBranch, aCurriculum, aCurriculumSubject } from './testing/builders'

const NOW = new Date('2026-11-01T12:00:00.000Z')
const UNLOCKED = { locked: false }
const LOCKED = { locked: true }

const SLOPE = aBranch({ id: 'b-comp', name: 'Computação' })
const EMPHASIS = aBranch({
  id: 'b-enf',
  type: 'EMPHASIS',
  name: 'Sistemas',
  sigaaCode: '2023.1E1',
  minHours: 128,
  position: 1,
})
const GROUP = aBranch({
  id: 'b-grp',
  type: 'SPECIFIC_GROUP',
  name: 'Grupo A',
  parentId: 'b-enf',
  minComponents: 1,
  maxComponents: 2,
  position: 2,
})

const IA = aCurriculumSubject({
  code: 'ECO0083',
  semester: 7,
  nature: 'OPTATIVE',
  branches: [{ branchId: 'b-comp', nature: 'MANDATORY' }],
})
const ED = aCurriculumSubject({ code: 'ECO0018', semester: 3 })

const curriculum = (overrides: Partial<Curriculum> = {}) =>
  aCurriculum({
    branches: [SLOPE, EMPHASIS, GROUP],
    subjects: [IA, ED],
    ...overrides,
  })

const published = (overrides: Partial<Curriculum> = {}) =>
  curriculum({ status: 'PUBLISHED', publishedAt: NOW, ...overrides })

const subjectOf = (c: Curriculum, code: string): CurriculumSubject => {
  const found = c.subjects.find((item) => item.code === code)
  if (!found) throw new Error(`sem ${code}`)
  return found
}

const branchOf = (c: Curriculum, id: string): Branch => {
  const found = c.branches.find((item) => item.id === id)
  if (!found) throw new Error(`sem ${id}`)
  return found
}

const lockedError = { code: 'CURRICULUM_LOCKED_FIELD' }

// Uma linha da tabela "Ciclo de vida e edição" por bloco. Antes da primeira
// matrícula (locked: false) tudo é editável.
describe('EC: período, slug e cargas horárias exigidas', () => {
  it.each([
    ['code', { code: '2007.1' }],
    ['effectiveTerm', { effectiveTerm: '2007.1' }],
    ['slug', { slug: '2007-1' }],
    ['minTotalHours', { minTotalHours: 4000 }],
    ['mandatoryHours', { mandatoryHours: 3000 }],
    ['maxPeriods', { maxPeriods: 16 }],
    ['minEmphases', { minEmphases: 1 }],
  ])('%s: bloqueado depois da 1ª matrícula', (_, patch) => {
    expect(() => updateHeader(published(), patch, LOCKED)).toThrow(
      expect.objectContaining(lockedError),
    )
  })

  it('tudo editável antes da 1ª matrícula', () => {
    const updated = updateHeader(
      published(),
      { code: '2007.1', slug: '2007-1', minTotalHours: 4000 },
      UNLOCKED,
    )
    expect(updated.header).toMatchObject({
      code: '2007.1',
      slug: '2007-1',
      minTotalHours: 4000,
    })
  })

  it('textos do SIGAA continuam livres e valor igual não conta como mudança', () => {
    const c = published()
    const updated = updateHeader(
      c,
      {
        matrixName: 'OUTRA MATRIZ',
        unitName: null,
        sigaaId: '123',
        minTotalHours: c.header.minTotalHours,
      },
      LOCKED,
    )
    expect(updated.header.matrixName).toBe('OUTRA MATRIZ')
    expect(updated.header.sigaaId).toBe('123')
  })

  it('recusa mínimo de ênfases maior que o máximo', () => {
    expect(() =>
      updateHeader(curriculum(), { minEmphases: 3, maxEmphases: 1 }, UNLOCKED),
    ).toThrow(expect.objectContaining({ code: 'INVALID_RANGE' }))
  })
})

describe('EC: is_current', () => {
  it('livre mesmo depois da 1ª matrícula', () => {
    expect(markCurrent(published()).isCurrent).toBe(true)
  })

  it('só uma EC publicada pode ser vigente', () => {
    expect(() => markCurrent(curriculum())).toThrow(
      expect.objectContaining({ code: 'CURRICULUM_NOT_PUBLISHED' }),
    )
  })
})

describe('Disciplina na EC: adicionar', () => {
  const nova = aCurriculumSubject({
    code: 'ECO0101',
    nature: 'OPTATIVE',
    branches: [{ branchId: 'b-comp', nature: 'OPTATIVE' }],
  })

  it('livre depois da 1ª matrícula', () => {
    const updated = addSubject(published(), nova)
    expect(subjectOf(updated, 'ECO0101').branches).toHaveLength(1)
  })

  it('recusa código repetido, vertente inexistente e vínculo duplicado', () => {
    expect(() =>
      addSubject(curriculum(), { ...nova, code: 'ECO0083' }),
    ).toThrow(expect.objectContaining({ code: 'CURRICULUM_SUBJECT_EXISTS' }))
    expect(() =>
      addSubject(curriculum(), {
        ...nova,
        branches: [{ branchId: 'nao-existe', nature: 'MANDATORY' }],
      }),
    ).toThrow(expect.objectContaining({ code: 'BRANCH_NOT_FOUND' }))
    expect(() =>
      addSubject(curriculum(), {
        ...nova,
        branches: [
          { branchId: 'b-comp', nature: 'MANDATORY' },
          { branchId: 'b-comp', nature: 'OPTATIVE' },
        ],
      }),
    ).toThrow(expect.objectContaining({ code: 'DUPLICATE_BRANCH_LINK' }))
  })
})

describe('Disciplina na EC: remover e trocar natureza', () => {
  const edit = (c: Curriculum, changes: Partial<CurriculumSubject>) => ({
    semester: subjectOf(c, 'ECO0083').semester,
    nature: subjectOf(c, 'ECO0083').nature,
    prerequisites: null,
    corequisites: null,
    branches: subjectOf(c, 'ECO0083').branches,
    ...changes,
  })

  it('bloqueado depois da 1ª matrícula', () => {
    const c = published()
    expect(() => removeSubject(c, 'ECO0083', LOCKED)).toThrow(
      expect.objectContaining(lockedError),
    )
    expect(() =>
      updateSubject(c, 'ECO0083', edit(c, { nature: 'MANDATORY' }), LOCKED),
    ).toThrow(expect.objectContaining(lockedError))
  })

  it('livre antes da 1ª matrícula', () => {
    const c = published()
    expect(removeSubject(c, 'ECO0083', UNLOCKED).subjects).toHaveLength(1)
    expect(
      subjectOf(
        updateSubject(c, 'ECO0083', edit(c, { nature: 'MANDATORY' }), UNLOCKED),
        'ECO0083',
      ).nature,
    ).toBe('MANDATORY')
  })

  it('disciplina fora da EC', () => {
    expect(() => removeSubject(curriculum(), 'XYZ0001', UNLOCKED)).toThrow(
      expect.objectContaining({ code: 'CURRICULUM_SUBJECT_NOT_FOUND' }),
    )
  })
})

describe('Disciplina na EC: semestre ideal e requisitos', () => {
  it('livres depois da 1ª matrícula', () => {
    const c = published()
    const requisito = {
      kind: 'or' as const,
      items: [
        { kind: 'subject' as const, code: 'CEC0022' },
        { kind: 'subject' as const, code: 'ECO0018' },
      ],
    }
    const updated = updateSubject(
      c,
      'ECO0083',
      {
        semester: 8,
        nature: 'OPTATIVE',
        prerequisites: requisito,
        corequisites: { kind: 'subject', code: 'ECO0018' },
        branches: IA.branches,
      },
      LOCKED,
    )
    expect(subjectOf(updated, 'ECO0083')).toMatchObject({
      semester: 8,
      prerequisites: requisito,
      corequisites: { kind: 'subject', code: 'ECO0018' },
    })
  })
})

describe('Vertente: nome, descrição e cor', () => {
  it('livres depois da 1ª matrícula', () => {
    const updated = updateBranch(
      published(),
      'b-comp',
      {
        ...SLOPE,
        name: 'Ciências de Computação',
        description: 'IA e teoria',
        color: '#0891b2',
      },
      LOCKED,
    )
    expect(branchOf(updated, 'b-comp')).toMatchObject({
      name: 'Ciências de Computação',
      description: 'IA e teoria',
      color: '#0891b2',
    })
  })
})

describe('Vertente: criar', () => {
  it('livre depois da 1ª matrícula, no fim da lista', () => {
    const updated = createBranch(
      published(),
      aBranch({ id: 'b-nova', name: 'Telecom', position: 0 }),
    )
    expect(branchOf(updated, 'b-nova').position).toBe(3)
  })

  it('confere a vertente-mãe e os limites', () => {
    expect(() =>
      createBranch(curriculum(), aBranch({ id: 'x', parentId: 'nao-existe' })),
    ).toThrow(expect.objectContaining({ code: 'BRANCH_NOT_FOUND' }))
    expect(() =>
      createBranch(
        curriculum(),
        aBranch({ id: 'x', minHours: 200, maxHours: 100 }),
      ),
    ).toThrow(expect.objectContaining({ code: 'INVALID_RANGE' }))
    expect(() =>
      createBranch(
        curriculum(),
        aBranch({ id: 'x', minComponents: 3, maxComponents: 1 }),
      ),
    ).toThrow(expect.objectContaining({ code: 'INVALID_RANGE' }))
  })
})

describe('Vertente: remover, tipo, pai e mínimos', () => {
  it.each([
    ['type', { type: 'EMPHASIS' as const }],
    ['parentId', { parentId: 'b-enf' }],
    ['minHours', { minHours: 64 }],
    ['maxComponents', { maxComponents: 3 }],
    ['mandatoryHours', { mandatoryHours: 32 }],
  ])('%s: bloqueado depois da 1ª matrícula', (_, patch) => {
    expect(() =>
      updateBranch(published(), 'b-comp', { ...SLOPE, ...patch }, LOCKED),
    ).toThrow(expect.objectContaining(lockedError))
  })

  it('remover: bloqueado depois da 1ª matrícula', () => {
    expect(() => removeBranch(published(), 'b-comp', LOCKED)).toThrow(
      expect.objectContaining(lockedError),
    )
  })

  it('remover antes da 1ª matrícula tira também os vínculos', () => {
    const updated = removeBranch(published(), 'b-comp', UNLOCKED)
    expect(updated.branches.map((item) => item.id)).toEqual(['b-enf', 'b-grp'])
    expect(subjectOf(updated, 'ECO0083').branches).toEqual([])
  })

  it('não remove vertente com grupos dentro, nem cria ciclo', () => {
    expect(() => removeBranch(curriculum(), 'b-enf', UNLOCKED)).toThrow(
      expect.objectContaining({ code: 'BRANCH_HAS_CHILDREN' }),
    )
    expect(() =>
      updateBranch(
        curriculum(),
        'b-enf',
        { ...EMPHASIS, parentId: 'b-grp' },
        UNLOCKED,
      ),
    ).toThrow(expect.objectContaining({ code: 'BRANCH_CYCLE' }))
    expect(() =>
      updateBranch(curriculum(), 'nao-existe', SLOPE, UNLOCKED),
    ).toThrow(expect.objectContaining({ code: 'BRANCH_NOT_FOUND' }))
  })
})

describe('Disciplina ↔ vertente', () => {
  it('adicionar: livre depois da 1ª matrícula', () => {
    const updated = setBranchSubjects(
      published(),
      'b-comp',
      [
        { code: 'ECO0083', nature: 'MANDATORY' },
        { code: 'ECO0018', nature: 'OPTATIVE' },
      ],
      LOCKED,
    )
    expect(subjectOf(updated, 'ECO0018').branches).toEqual([
      { branchId: 'b-comp', nature: 'OPTATIVE' },
    ])
  })

  it('remover e trocar natureza: bloqueado depois da 1ª matrícula', () => {
    expect(() => setBranchSubjects(published(), 'b-comp', [], LOCKED)).toThrow(
      expect.objectContaining(lockedError),
    )
    expect(() =>
      setBranchSubjects(
        published(),
        'b-comp',
        [{ code: 'ECO0083', nature: 'OPTATIVE' }],
        LOCKED,
      ),
    ).toThrow(expect.objectContaining(lockedError))
    const c = published()
    expect(() =>
      updateSubject(
        c,
        'ECO0083',
        {
          semester: 7,
          nature: 'OPTATIVE',
          prerequisites: null,
          corequisites: null,
          branches: [],
        },
        LOCKED,
      ),
    ).toThrow(expect.objectContaining(lockedError))
  })

  it('livre antes da 1ª matrícula', () => {
    const updated = setBranchSubjects(published(), 'b-comp', [], UNLOCKED)
    expect(subjectOf(updated, 'ECO0083').branches).toEqual([])
  })

  it('confere vertente e disciplinas', () => {
    expect(() => setBranchSubjects(curriculum(), 'x', [], UNLOCKED)).toThrow(
      expect.objectContaining({ code: 'BRANCH_NOT_FOUND' }),
    )
    expect(() =>
      setBranchSubjects(
        curriculum(),
        'b-comp',
        [{ code: 'XYZ0001', nature: 'MANDATORY' }],
        UNLOCKED,
      ),
    ).toThrow(expect.objectContaining({ code: 'CURRICULUM_SUBJECT_NOT_FOUND' }))
  })
})

describe('Publicação', () => {
  const ok: PublicationCheck = { canPublish: true, errors: [], warnings: [] }

  it('rascunho com checagem limpa vira publicada', () => {
    const updated = publish(curriculum(), ok, { userId: 'u1', now: NOW })
    expect(updated).toMatchObject({
      status: 'PUBLISHED',
      publishedAt: NOW,
      publishedBy: 'u1',
    })
  })

  it('erro na checagem barra e EC publicada não publica de novo', () => {
    expect(() =>
      publish(
        curriculum(),
        {
          canPublish: false,
          errors: [{ code: 'X', message: 'x', subjectCode: null }],
          warnings: [],
        },
        { userId: 'u1', now: NOW },
      ),
    ).toThrow(
      expect.objectContaining({ code: 'CURRICULUM_PUBLICATION_BLOCKED' }),
    )
    expect(() => publish(published(), ok, { userId: 'u1', now: NOW })).toThrow(
      expect.objectContaining({ code: 'CURRICULUM_ALREADY_PUBLISHED' }),
    )
  })
})
