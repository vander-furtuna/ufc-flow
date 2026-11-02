import { curriculumImportV1Schema } from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'

import { aSubject } from '../domain/testing/builders'
import {
  anImport,
  anImportBranch,
  anImportSubject,
} from '../domain/testing/imports'
import {
  actor,
  harness,
  MODERATOR_ID,
  OTHER_ID,
  QUIMICA,
} from './testing/harness'

const payload = anImport({
  branches: [anImportBranch({ key: 'slope-comp', name: 'Computação' })],
  subjects: [
    anImportSubject({
      code: 'SBL0074',
      name: 'FÍSICA GERAL I (TEORIA)',
      branches: [{ key: 'slope-comp', nature: 'MANDATORY' }],
    }),
    anImportSubject({
      code: 'ECO0101',
      name: 'COMPILADORES',
      semester: 7,
      nature: 'OPTATIVE',
      prerequisites: { kind: 'subject', code: 'CEC0058' },
      equivalences: { kind: 'subject', code: 'CEC0099' },
    }),
  ],
})

// Física já existe no catálogo com outro nome
async function seeded() {
  const h = harness()
  const { course, moderator } = await h.withCourse()
  const fisica = aSubject({
    id: 'b0000000-0000-4000-8000-000000000001',
    code: 'SBL0074',
    name: 'FÍSICA GERAL I',
  })
  h.catalog.subjects.set(fisica.id, fisica)
  return { ...h, course, moderator, fisica }
}

describe('CreateImportUseCase', () => {
  it('moderador do curso envia e o rascunho nasce com os pontos para revisar', async () => {
    const h = await seeded()
    const view = await h.createImport.execute(h.moderator, payload, 'EXTENSION')

    expect(view).toMatchObject({
      status: 'APPLIED',
      pendingReason: null,
      course: {
        sigaaId: '415113',
        id: h.course.id,
        slug: 'engenharia-de-computacao',
      },
      subjectCount: 2,
      reviewPointCount: 3,
      importedBy: { id: MODERATOR_ID, name: 'Ana Moderadora' },
    })
    const ec = h.catalog.curricula.get(view.curriculum.id as string)
    expect(ec).toMatchObject({ status: 'DRAFT', header: { slug: '2006-2' } })
    expect(
      [...h.catalog.subjects.values()].map((item) => item.code).sort(),
    ).toEqual(['ECO0101', 'SBL0074'])
    // Moderador não troca equivalências: ficam como sugestão
    expect(
      [...h.catalog.subjects.values()].find((item) => item.code === 'ECO0101')
        ?.equivalences,
    ).toBeNull()
    expect(h.catalog.auditEntries.at(-1)?.action).toBe(
      'curriculum_import.received',
    )

    const managed = await h.getManaged.execute(h.moderator, ec!.id)
    expect(managed.lastImportId).toBe(view.id)
    expect(managed.reviewPoints.map((point) => point.type)).toEqual([
      'SUBJECT_NAME_MISMATCH',
      'EQUIVALENCES_SUGGESTED',
      'UNKNOWN_REQUIREMENT_CODE',
    ])
    expect(managed.publicationCheck.canPublish).toBe(false)
  })

  it('importação de admin aplica as equivalências', async () => {
    const h = await seeded()
    await h.createImport.execute(h.admin, payload, 'UPLOAD')
    expect(
      [...h.catalog.subjects.values()].find((item) => item.code === 'ECO0101')
        ?.equivalences,
    ).toEqual({ kind: 'subject', code: 'CEC0099' })
  })

  it('recusa moderador de outro curso, quem não modera nada e curso trocado', async () => {
    const h = await seeded()
    const other = actor(OTHER_ID, {
      moderatedCourseIds: new Set(['outro-curso']),
    })
    await expect(
      h.createImport.execute(other, payload, 'EXTENSION'),
    ).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    })
    await expect(
      h.createImport.execute(
        actor(OTHER_ID),
        anImport({ course: { sigaaId: QUIMICA.sigaaId } }),
        'EXTENSION',
      ),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
    await expect(
      h.createImport.execute(
        h.moderator,
        anImport({
          curriculum: { matrixName: 'MEDICINA - SOBRAL - Presencial - MT' },
        }),
        'EXTENSION',
      ),
    ).rejects.toMatchObject({ code: 'CURRICULUM_IMPORT_COURSE_MISMATCH' })
  })

  it('curso inexistente: fica pendente e vira rascunho quando o admin cria o curso', async () => {
    const h = await seeded()
    const quimica = anImport({
      course: {
        sigaaId: QUIMICA.sigaaId,
        name: 'QUÍMICA',
        recognition: 'MANUAL',
      },
    })
    const pending = await h.createImport.execute(
      h.moderator,
      quimica,
      'EXTENSION',
    )
    expect(pending).toMatchObject({
      status: 'RECEIVED',
      pendingReason: 'COURSE_MISSING',
      course: { id: null },
    })
    await expect(
      h.applyImport.execute(h.moderator, pending.id),
    ).rejects.toMatchObject({
      code: 'CURRICULUM_IMPORT_COURSE_MISSING',
    })

    const course = await h.createCourse.execute(h.admin, {
      sigaaId: QUIMICA.sigaaId,
      slug: 'quimica',
      name: 'Química',
      icon: 'flask',
      color: null,
    })
    expect(course.campus).toMatchObject({
      slug: 'fortaleza',
      name: 'UFC em Fortaleza',
    })
    expect(course.curricula).toEqual([
      expect.objectContaining({ status: 'DRAFT', slug: '2006-2' }),
    ])
    const applied = await h.getImport.execute(h.admin, pending.id)
    expect(applied).toMatchObject({
      status: 'APPLIED',
      course: { id: course.id },
    })
  })
})

describe('reimportação', () => {
  async function reimported() {
    const h = await seeded()
    const first = await h.createImport.execute(h.admin, payload, 'UPLOAD')
    const changed = anImport({
      curriculum: { minTotalHours: 3700 },
      branches: payload.branches,
      subjects: [
        payload.subjects[0]!,
        { ...payload.subjects[1]!, semester: 8 },
        anImportSubject({ code: 'ECO0200', name: 'NOVA' }),
      ],
    })
    const second = await h.createImport.execute(
      h.moderator,
      changed,
      'EXTENSION',
    )
    return { ...h, first, second }
  }

  it('espera o diff ser conferido e mostra a prévia', async () => {
    const h = await reimported()
    expect(h.second).toMatchObject({
      status: 'RECEIVED',
      pendingReason: 'DIFF_REVIEW',
      curriculum: { id: h.first.curriculum.id },
    })
    const detail = await h.getImport.execute(h.moderator, h.second.id)
    expect(detail.diff).toMatchObject({
      header: [{ field: 'minTotalHours', before: 3648, after: 3700 }],
      subjects: {
        added: ['ECO0200'],
        removed: [],
        changed: [
          {
            key: 'ECO0101',
            fields: [{ field: 'semester', before: 7, after: 8 }],
          },
        ],
      },
    })
    expect(detail.reviewPoints.map((point) => point.type)).toEqual([
      'SUBJECT_NAME_MISMATCH',
      'UNKNOWN_REQUIREMENT_CODE',
    ])
  })

  it('aplicar atualiza a mesma EC; aplicar de novo não pode', async () => {
    const h = await reimported()
    const applied = await h.applyImport.execute(h.moderator, h.second.id)
    expect(applied).toMatchObject({ status: 'APPLIED', diff: null })
    const ec = h.catalog.curricula.get(h.first.curriculum.id as string)
    expect(ec?.header.minTotalHours).toBe(3700)
    expect(ec?.subjects.map((item) => item.code)).toContain('ECO0200')
    await expect(
      h.applyImport.execute(h.moderator, h.second.id),
    ).rejects.toMatchObject({
      code: 'CURRICULUM_IMPORT_NOT_PENDING',
    })
  })

  it('reimportar EC publicada audita e tira a marca de reimportação', async () => {
    const h = await reimported()
    const id = h.first.curriculum.id as string
    h.catalog.curricula.set(id, {
      ...h.catalog.curricula.get(id)!,
      status: 'PUBLISHED',
      needsReimport: true,
    })
    await h.applyImport.execute(h.moderator, h.second.id)
    expect(h.catalog.curricula.get(id)?.needsReimport).toBe(false)
    expect(h.catalog.auditEntries.map((entry) => entry.action)).toContain(
      'curriculum.reimported',
    )
  })

  it('acha a EC pelo código, mesmo com o endereço editado', async () => {
    const h = await seeded()
    const first = await h.createImport.execute(h.admin, payload, 'UPLOAD')
    const id = first.curriculum.id as string
    const ec = h.catalog.curricula.get(id)!
    h.catalog.curricula.set(id, {
      ...ec,
      header: { ...ec.header, slug: '2005-1' },
    })
    const again = await h.createImport.execute(
      h.moderator,
      payload,
      'EXTENSION',
    )
    expect(again).toMatchObject({
      pendingReason: 'DIFF_REVIEW',
      curriculum: { id },
    })
    await h.applyImport.execute(h.moderator, again.id)
    expect(h.catalog.curricula.get(id)?.header.slug).toBe('2005-1')
  })

  it('descartar deixa a EC como estava', async () => {
    const h = await reimported()
    const discarded = await h.discardImport.execute(h.moderator, h.second.id)
    expect(discarded).toMatchObject({
      status: 'DISCARDED',
      pendingReason: null,
    })
    expect(
      h.catalog.curricula.get(h.first.curriculum.id as string)?.header
        .minTotalHours,
    ).toBe(3648)
    await expect(
      h.discardImport.execute(h.moderator, h.second.id),
    ).rejects.toMatchObject({
      code: 'CURRICULUM_IMPORT_NOT_PENDING',
    })
  })
})

describe('ListImportsUseCase e GetImportUseCase', () => {
  it('admin vê tudo; moderador vê o curso dele e o que enviou', async () => {
    const h = await seeded()
    await h.createImport.execute(h.admin, payload, 'UPLOAD')
    const pending = await h.createImport.execute(
      h.moderator,
      anImport({ course: { sigaaId: QUIMICA.sigaaId, recognition: 'MANUAL' } }),
      'EXTENSION',
    )
    const other = actor(OTHER_ID, { moderatedCourseIds: new Set(['x']) })
    await h.createImport.execute(
      other,
      anImport({ course: { sigaaId: '999999', recognition: 'MANUAL' } }),
      'EXTENSION',
    )

    const all = await h.listImports.execute(h.admin, { limit: 2 })
    expect(all.items).toHaveLength(2)
    expect(all.nextCursor).not.toBeNull()
    const rest = await h.listImports.execute(h.admin, {
      limit: 2,
      cursor: all.nextCursor as string,
    })
    expect(rest.items).toHaveLength(1)

    const mine = await h.listImports.execute(h.moderator, { limit: 20 })
    expect(mine.items).toHaveLength(2)
    const received = await h.listImports.execute(h.moderator, {
      limit: 20,
      status: 'RECEIVED',
    })
    expect(received.items.map((item) => item.id)).toEqual([pending.id])

    await expect(h.getImport.execute(other, pending.id)).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    })
    await expect(
      h.getImport.execute(h.admin, 'nao-existe'),
    ).rejects.toMatchObject({
      code: 'CURRICULUM_IMPORT_NOT_FOUND',
    })
    expect(() =>
      h.listImports.execute(actor(null as unknown as string), { limit: 20 }),
    ).toThrow(expect.objectContaining({ code: 'ACCESS_DENIED' }))
  })
})

describe('ResolveReviewPointUseCase', () => {
  async function imported() {
    const h = await seeded()
    const view = await h.createImport.execute(h.moderator, payload, 'EXTENSION')
    return {
      ...h,
      importId: view.id,
      curriculumId: view.curriculum.id as string,
    }
  }

  it('usar o nome do SIGAA renomeia a disciplina global', async () => {
    const h = await imported()
    const managed = await h.resolve.execute(
      h.moderator,
      h.importId,
      'name:SBL0074',
      'USE_IMPORTED',
    )
    expect(h.catalog.subjects.get(h.fisica.id)?.name).toBe(
      'FÍSICA GERAL I (TEORIA)',
    )
    expect(managed.reviewPoints[0]).toMatchObject({
      resolution: 'USE_IMPORTED',
    })
    expect(h.catalog.auditEntries.at(-1)?.action).toBe('subject.rename_subject')
  })

  it('requisito fora do catálogo fica ciente e a EC publica', async () => {
    const h = await imported()
    await h.resolve.execute(
      h.moderator,
      h.importId,
      'name:SBL0074',
      'KEEP_CATALOG',
    )
    const managed = await h.resolve.execute(
      h.moderator,
      h.importId,
      'unknown:ECO0101:CEC0058',
      'ACKNOWLEDGED',
    )
    expect(managed.publicationCheck.canPublish).toBe(true)
    expect(
      managed.publicationCheck.warnings.map((item) => item.code),
    ).toContain('PENDING_EQUIVALENCE_SUGGESTION')
  })

  it('equivalência sugerida: só admin aplica', async () => {
    const h = await imported()
    await expect(
      h.resolve.execute(
        h.moderator,
        h.importId,
        'equivalences:ECO0101',
        'APPLY',
      ),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
    await h.resolve.execute(
      h.admin,
      h.importId,
      'equivalences:ECO0101',
      'APPLY',
    )
    expect(
      [...h.catalog.subjects.values()].find((item) => item.code === 'ECO0101')
        ?.equivalences,
    ).toEqual({ kind: 'subject', code: 'CEC0099' })
  })

  it('carga do SIGAA não entra se a disciplina está em EC publicada', async () => {
    const h = await seeded()
    const fisica = h.catalog.subjects.get(h.fisica.id)!
    h.catalog.curricula.set('pub', {
      ...(await h.createImport
        .execute(
          h.admin,
          anImport({
            subjects: [anImportSubject({ code: 'SBL0074', name: fisica.name })],
          }),
          'UPLOAD',
        )
        .then((view) =>
          h.catalog.curricula.get(view.curriculum.id as string)!,
        )),
      id: 'pub',
      status: 'PUBLISHED',
    })
    const view = await h.createImport.execute(
      h.admin,
      anImport({
        curriculum: { code: '2025.1', effectiveTerm: '2025.1' },
        subjects: [
          anImportSubject({
            code: 'SBL0074',
            name: fisica.name,
            workloadHours: 96,
          }),
        ],
      }),
      'UPLOAD',
    )
    await expect(
      h.resolve.execute(h.admin, view.id, 'workload:SBL0074', 'USE_IMPORTED'),
    ).rejects.toMatchObject({ code: 'SUBJECT_LOCKED_FIELD' })
  })

  it('ponto inexistente ou importação sem EC', async () => {
    const h = await imported()
    await expect(
      h.resolve.execute(h.moderator, h.importId, 'nao-existe', 'ACKNOWLEDGED'),
    ).rejects.toMatchObject({ code: 'REVIEW_POINT_NOT_FOUND' })
    const pending = await h.createImport.execute(
      h.moderator,
      anImport({ course: { sigaaId: QUIMICA.sigaaId, recognition: 'MANUAL' } }),
      'EXTENSION',
    )
    await expect(
      h.resolve.execute(h.moderator, pending.id, 'x', 'ACKNOWLEDGED'),
    ).rejects.toMatchObject({ code: 'REVIEW_POINT_NOT_FOUND' })
  })
})

describe('ExportCurriculumUseCase', () => {
  it('exporta no formato de importação, válido pelo schema', async () => {
    const h = await seeded()
    const view = await h.createImport.execute(h.admin, payload, 'UPLOAD')
    const exported = await h.exportCurriculum.execute(
      h.admin,
      view.curriculum.id as string,
    )
    expect(curriculumImportV1Schema.safeParse(exported).success).toBe(true)
    expect(exported).toMatchObject({
      course: {
        sigaaId: '415113',
        name: 'ENGENHARIA DE COMPUTAÇÃO',
        recognition: 'MANUAL',
      },
      curriculum: { city: 'SOBRAL - CE', code: '2006.2' },
      branches: [{ key: 'branch-1', name: 'Computação' }],
    })
    expect(exported.subjects[0]?.branches).toEqual([
      { key: 'branch-1', nature: 'MANDATORY' },
    ])
  })
})
