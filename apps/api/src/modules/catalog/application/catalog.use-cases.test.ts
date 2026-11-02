import type { CurriculumSubjectInput } from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'

import { aHeader } from '../domain/testing/builders'
import { anImport, anImportSubject } from '../domain/testing/imports'
import {
  actor,
  ENG_COMP,
  harness,
  MODERATOR_ID,
  OTHER_ID,
  QUIMICA,
} from './testing/harness'

const header = aHeader({
  code: '2025.1',
  effectiveTerm: '2025.1',
  slug: '2025-1',
})

const subjectInput = (
  overrides: Partial<CurriculumSubjectInput> = {},
): CurriculumSubjectInput => ({
  semester: 1,
  nature: 'MANDATORY',
  prerequisites: null,
  corequisites: null,
  branches: [],
  ...overrides,
})

const newSubjectData = {
  name: 'Algoritmos',
  type: 'DISCIPLINE' as const,
  durationTerms: 1 as const,
  workloadHours: 64,
  theoryHours: 64,
  labHours: 0,
  eadHours: 0,
  extensionHours: 0,
  credits: 4,
}

const branchInput = {
  parentId: null,
  type: 'SLOPE' as const,
  name: 'Computação',
  description: null,
  sigaaCode: null,
  color: '#22d3ee',
  mandatoryHours: null,
  minHours: null,
  maxHours: null,
  minComponents: null,
  maxComponents: null,
}

describe('catálogo do SIGAA e cursos', () => {
  it('atualiza a lista do SIGAA e marca quem sumiu', async () => {
    const h = harness()
    expect(await h.refreshSigaa.execute(null)).toMatchObject({
      total: 2,
      added: 2,
      removed: 0,
    })
    h.source.courses = [ENG_COMP]
    expect(await h.refreshSigaa.execute(h.admin)).toMatchObject({
      total: 1,
      added: 0,
      removed: 1,
    })
    await expect(h.refreshSigaa.execute(actor(OTHER_ID))).rejects.toMatchObject(
      {
        code: 'ACCESS_DENIED',
      },
    )
    const entries = await h.listSigaa.execute()
    expect(
      entries.find((item) => item.sigaaCourse.sigaaId === QUIMICA.sigaaId),
    ).toMatchObject({
      removed: true,
      flowCourseId: null,
    })
  })

  it('admin cria curso do catálogo; campus da cidade é reaproveitado', async () => {
    const h = harness()
    const { course } = await h.withCourse()
    const listed = await h.listSigaa.execute()
    expect(
      listed.find((item) => item.flowCourseId === course.id)?.sigaaCourse
        .sigaaId,
    ).toBe(ENG_COMP.sigaaId)
    expect(h.catalog.campuses.size).toBe(1)
    expect(h.catalog.auditEntries.at(-1)?.action).toBe('course.created')

    const base = { slug: 'x', name: 'X', icon: 'cpu', color: null }
    await expect(
      h.createCourse.execute(h.admin, { ...base, sigaaId: ENG_COMP.sigaaId }),
    ).rejects.toMatchObject({ code: 'COURSE_ALREADY_EXISTS' })
    await expect(
      h.createCourse.execute(h.admin, {
        ...base,
        sigaaId: QUIMICA.sigaaId,
        slug: 'engenharia-de-computacao',
      }),
    ).rejects.toMatchObject({ code: 'COURSE_SLUG_TAKEN' })
    await expect(
      h.createCourse.execute(h.admin, { ...base, sigaaId: '1' }),
    ).rejects.toMatchObject({ code: 'SIGAA_COURSE_NOT_FOUND' })
    expect(() =>
      h.createCourse.execute(actor(OTHER_ID), {
        ...base,
        sigaaId: QUIMICA.sigaaId,
      }),
    ).toThrow(expect.objectContaining({ code: 'ACCESS_DENIED' }))
  })

  it('edita e exclui curso sem EC publicada', async () => {
    const h = harness()
    const { course, moderator } = await h.withCourse()
    await h.createCourse.execute(h.admin, {
      sigaaId: QUIMICA.sigaaId,
      slug: 'quimica',
      name: 'Química',
      icon: 'flask',
      color: null,
    })
    const updated = await h.updateCourse.execute(h.admin, course.id, {
      name: 'Eng. de Computação',
      isActive: false,
    })
    expect(updated).toMatchObject({
      name: 'Eng. de Computação',
      isActive: false,
    })
    await expect(
      h.updateCourse.execute(h.admin, course.id, { slug: 'quimica' }),
    ).rejects.toMatchObject({ code: 'COURSE_SLUG_TAKEN' })
    await expect(
      h.updateCourse.execute(h.admin, 'nao-existe', {}),
    ).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND' })

    const ec = await h.createCurriculum.execute(moderator, course.id, header)
    await h.addSubject.execute(moderator, ec.id, {
      code: 'ECO0001',
      ...subjectInput(),
      subject: newSubjectData,
    })
    await h.publish.execute(moderator, ec.id)
    await expect(
      h.deleteCourse.execute(h.admin, course.id),
    ).rejects.toMatchObject({
      code: 'COURSE_HAS_PUBLISHED_CURRICULA',
    })
    const quimica = [...h.catalog.courses.values()].find(
      (item) => item.slug === 'quimica',
    )!
    await h.deleteCourse.execute(h.admin, quimica.id)
    expect(h.catalog.courses.has(quimica.id)).toBe(false)
    await expect(
      h.deleteCourse.execute(h.admin, quimica.id),
    ).rejects.toMatchObject({
      code: 'COURSE_NOT_FOUND',
    })
  })

  it('lista os cursos geridos e os públicos', async () => {
    const h = harness()
    const { course, moderator } = await h.withCourse()
    await h.createCourse.execute(h.admin, {
      sigaaId: QUIMICA.sigaaId,
      slug: 'quimica',
      name: 'Química',
      icon: 'flask',
      color: null,
    })
    expect(
      (await h.managedCourses.execute(h.admin)).map((item) => item.slug),
    ).toEqual(['engenharia-de-computacao', 'quimica'])
    expect(
      (await h.managedCourses.execute(moderator)).map((item) => item.id),
    ).toEqual([course.id])
    expect(() => h.managedCourses.execute(actor(OTHER_ID))).toThrow(
      expect.objectContaining({ code: 'ACCESS_DENIED' }),
    )

    await h.updateCourse.execute(h.admin, course.id, { isActive: false })
    expect((await h.listCourses.execute()).map((item) => item.slug)).toEqual([
      'quimica',
    ])
    await expect(
      h.publicCourse.execute('engenharia-de-computacao'),
    ).rejects.toMatchObject({
      code: 'COURSE_NOT_FOUND',
    })
  })
})

describe('catálogo público', () => {
  it('mostra só EC publicada', async () => {
    const h = harness()
    const { course, moderator } = await h.withCourse()
    const ec = await h.createCurriculum.execute(moderator, course.id, header)
    await h.addSubject.execute(moderator, ec.id, {
      code: 'ECO0001',
      ...subjectInput(),
      subject: newSubjectData,
    })

    expect((await h.publicCourse.execute(course.slug)).curricula).toEqual([])
    await expect(
      h.publicCurriculum.execute(course.slug, '2025-1'),
    ).rejects.toMatchObject({
      code: 'CURRICULUM_NOT_FOUND',
    })

    await h.publish.execute(moderator, ec.id)
    const detail = await h.publicCurriculum.execute(course.slug, '2025-1')
    expect(detail).toMatchObject({
      status: 'PUBLISHED',
      course: { slug: course.slug },
      subjects: [{ code: 'ECO0001', name: 'Algoritmos', workloadHours: 64 }],
    })
    expect((await h.publicCourse.execute(course.slug)).curricula).toHaveLength(
      1,
    )
    await expect(
      h.publicCurriculum.execute('nao-existe', '2025-1'),
    ).rejects.toMatchObject({
      code: 'COURSE_NOT_FOUND',
    })
  })
})

describe('edição da EC', () => {
  async function draft() {
    const h = harness()
    const { course, moderator } = await h.withCourse()
    const ec = await h.createCurriculum.execute(moderator, course.id, header)
    return { ...h, course, moderator, id: ec.id }
  }

  it('cria à mão como rascunho vazio e recusa slug repetido ou sem permissão', async () => {
    const h = await draft()
    const managed = await h.getManaged.execute(h.moderator, h.id)
    expect(managed).toMatchObject({
      status: 'DRAFT',
      locked: false,
      lastImportId: null,
      subjects: [],
    })
    expect(managed.publicationCheck.errors.map((item) => item.code)).toEqual([
      'NO_SUBJECTS',
    ])
    await expect(
      h.createCurriculum.execute(h.moderator, h.course.id, header),
    ).rejects.toMatchObject({ code: 'CURRICULUM_SLUG_TAKEN' })
    expect(() =>
      h.createCurriculum.execute(actor(OTHER_ID), h.course.id, header),
    ).toThrow(expect.objectContaining({ code: 'ACCESS_DENIED' }))
    await expect(
      h.createCurriculum.execute(h.admin, 'nao-existe', header),
    ).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND' })
    await expect(
      h.getManaged.execute(actor(OTHER_ID), h.id),
    ).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    })
    await expect(
      h.getManaged.execute(h.admin, 'nao-existe'),
    ).rejects.toMatchObject({
      code: 'CURRICULUM_NOT_FOUND',
    })
  })

  it('edita cabeçalho, disciplinas e vertentes', async () => {
    const h = await draft()
    await h.updateCurriculum.execute(h.moderator, h.id, { minTotalHours: 4000 })
    await expect(
      h.updateCurriculum.execute(h.moderator, h.id, { slug: '2025-1' }),
    ).resolves.toBeDefined()

    await expect(
      h.addSubject.execute(h.moderator, h.id, {
        code: 'ECO0001',
        ...subjectInput(),
        subject: null,
      }),
    ).rejects.toMatchObject({ code: 'SUBJECT_DATA_REQUIRED' })
    await h.addSubject.execute(h.moderator, h.id, {
      code: 'ECO0001',
      ...subjectInput(),
      subject: newSubjectData,
    })
    // Segunda EC reaproveita a disciplina global
    const other = await h.createCurriculum.execute(h.moderator, h.course.id, {
      ...header,
      code: '2026.1',
      slug: '2026-1',
    })
    await h.addSubject.execute(h.moderator, other.id, {
      code: 'ECO0001',
      ...subjectInput(),
      subject: null,
    })
    expect(h.catalog.subjects.size).toBe(1)

    let managed = await h.createBranch.execute(h.moderator, h.id, branchInput)
    const branchId = managed.branches[0]!.id
    managed = await h.updateBranch.execute(h.moderator, h.id, branchId, {
      ...branchInput,
      name: 'Ciências de Computação',
    })
    expect(managed.branches[0]?.name).toBe('Ciências de Computação')

    managed = await h.setBranchSubjects.execute(h.moderator, h.id, branchId, {
      subjects: [{ code: 'ECO0001', nature: 'MANDATORY' }],
    })
    expect(managed.subjects[0]?.branches).toEqual([
      { branchId, nature: 'MANDATORY' },
    ])

    managed = await h.updateSubjectInCurriculum.execute(
      h.moderator,
      h.id,
      'ECO0001',
      {
        ...subjectInput({
          semester: 2,
          branches: [{ branchId, nature: 'OPTATIVE' }],
        }),
      },
    )
    expect(managed.subjects[0]).toMatchObject({ semester: 2 })

    managed = await h.removeBranch.execute(h.moderator, h.id, branchId)
    expect(managed.branches).toEqual([])
    managed = await h.removeSubject.execute(h.moderator, h.id, 'ECO0001')
    expect(managed.subjects).toEqual([])
    expect(managed.header.minTotalHours).toBe(4000)
    // Rascunho não audita
    expect(
      h.catalog.auditEntries.every((entry) => entry.entity !== 'curriculum'),
    ).toBe(true)
  })

  it('slug de outra EC do curso não pode', async () => {
    const h = await draft()
    await h.createCurriculum.execute(h.moderator, h.course.id, {
      ...header,
      code: '2026.1',
      slug: '2026-1',
    })
    await expect(
      h.updateCurriculum.execute(h.moderator, h.id, { slug: '2026-1' }),
    ).rejects.toMatchObject({ code: 'CURRICULUM_SLUG_TAKEN' })
  })

  it('publica, marca vigente, audita e trava com matrícula', async () => {
    const h = await draft()
    await h.addSubject.execute(h.moderator, h.id, {
      code: 'ECO0001',
      ...subjectInput(),
      subject: newSubjectData,
    })
    const published = await h.publish.execute(h.moderator, h.id)
    expect(published).toMatchObject({ status: 'PUBLISHED', isCurrent: false })
    await expect(h.publish.execute(h.moderator, h.id)).rejects.toMatchObject({
      code: 'CURRICULUM_ALREADY_PUBLISHED',
    })

    const current = await h.markCurrent.execute(h.moderator, h.id)
    expect(current.isCurrent).toBe(true)

    await h.updateSubjectInCurriculum.execute(
      h.moderator,
      h.id,
      'ECO0001',
      subjectInput({ semester: 3 }),
    )
    expect(h.catalog.auditEntries.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        'curriculum.published',
        'curriculum.marked_current',
        'curriculum.subject_updated',
      ]),
    )

    h.catalog.enrollments.set(h.id, 1)
    expect((await h.getManaged.execute(h.moderator, h.id)).locked).toBe(true)
    await expect(
      h.updateSubjectInCurriculum.execute(
        h.moderator,
        h.id,
        'ECO0001',
        subjectInput({ semester: 3, nature: 'OPTATIVE' }),
      ),
    ).rejects.toMatchObject({ code: 'CURRICULUM_LOCKED_FIELD' })
    await expect(
      h.deleteCurriculum.execute(h.moderator, h.id),
    ).rejects.toMatchObject({
      code: 'CURRICULUM_ALREADY_PUBLISHED',
    })
  })

  it('marcar vigente troca a anterior do curso; rascunho não pode', async () => {
    const h = await draft()
    const publishOne = async (code: string) => {
      const ec = await h.createCurriculum.execute(h.moderator, h.course.id, {
        ...header,
        code,
        slug: code.replace('.', '-'),
      })
      await h.addSubject.execute(h.moderator, ec.id, {
        code: 'ECO0001',
        ...subjectInput(),
        subject: h.catalog.subjects.size === 0 ? newSubjectData : null,
      })
      await h.publish.execute(h.moderator, ec.id)
      return ec.id
    }
    const a = await publishOne('2026.1')
    const b = await publishOne('2026.2')
    await h.markCurrent.execute(h.moderator, a)
    await h.markCurrent.execute(h.moderator, b)
    expect(h.catalog.curricula.get(a)?.isCurrent).toBe(false)
    expect(h.catalog.curricula.get(b)?.isCurrent).toBe(true)
    await expect(
      h.markCurrent.execute(h.moderator, h.id),
    ).rejects.toMatchObject({
      code: 'CURRICULUM_NOT_PUBLISHED',
    })
    await h.deleteCurriculum.execute(h.moderator, h.id)
    expect(h.catalog.curricula.has(h.id)).toBe(false)
  })
})

describe('disciplina global', () => {
  async function withSubject() {
    const h = harness()
    const { moderator } = await h.withCourse()
    await h.createImport.execute(
      h.admin,
      anImport({
        subjects: [
          anImportSubject({ code: 'ECO0001', name: 'ALGORITMOS' }),
          anImportSubject({ code: 'ECO0002', name: 'ESTRUTURAS' }),
        ],
      }),
      'UPLOAD',
    )
    return { ...h, moderator }
  }

  it('busca pelos códigos, em ordem, ignorando os que não existem', async () => {
    const h = await withSubject()
    expect(
      (await h.subjectsByCodes.execute(['ECO0002', 'XYZ0001', 'ECO0001'])).map(
        (item) => [item.code, item.name],
      ),
    ).toEqual([
      ['ECO0001', 'ALGORITMOS'],
      ['ECO0002', 'ESTRUTURAS'],
    ])
  })

  it('só admin edita; código repetido não pode', async () => {
    const h = await withSubject()
    const updated = await h.updateSubject.execute(h.admin, 'ECO0001', {
      name: 'Algoritmos',
      workloadHours: 96,
    })
    expect(updated).toMatchObject({ name: 'Algoritmos', workloadHours: 96 })
    expect(() =>
      h.updateSubject.execute(h.moderator, 'ECO0001', { name: 'x' }),
    ).toThrow(expect.objectContaining({ code: 'ACCESS_DENIED' }))
    await expect(
      h.updateSubject.execute(h.admin, 'ECO0001', { code: 'ECO0002' }),
    ).rejects.toMatchObject({ code: 'SUBJECT_CODE_TAKEN' })
    await expect(
      h.updateSubject.execute(h.admin, 'XYZ0001', { name: 'x' }),
    ).rejects.toMatchObject({ code: 'SUBJECT_NOT_FOUND' })
  })

  it('equivalências: só admin, com auditoria', async () => {
    const h = await withSubject()
    const expr = { kind: 'subject' as const, code: 'CEC0058' }
    expect(
      (await h.setEquivalences.execute(h.admin, 'ECO0001', expr)).equivalences,
    ).toEqual(expr)
    expect(h.catalog.auditEntries.at(-1)).toMatchObject({
      action: 'subject.equivalences_set',
      actorId: h.admin.userId,
    })
    expect(() =>
      h.setEquivalences.execute(h.moderator, 'ECO0001', null),
    ).toThrow(expect.objectContaining({ code: 'ACCESS_DENIED' }))
  })

  it('nome do importador removido aparece como conta removida', async () => {
    const h = await withSubject()
    h.catalog.userNames.delete(MODERATOR_ID)
    const view = await h.createImport.execute(
      h.moderator,
      anImport({ curriculum: { code: '2025.1', effectiveTerm: '2025.1' } }),
      'EXTENSION',
    )
    expect(view.importedBy?.name).toBe('Conta removida')
  })
})
