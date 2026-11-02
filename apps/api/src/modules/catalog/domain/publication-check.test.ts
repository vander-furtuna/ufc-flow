import { describe, expect, it } from 'vitest'

import { checkPublication } from './publication-check'
import {
  isBlocking,
  resolveReviewPoint,
  type ReviewPoint,
} from './review-points'
import { aBranch, aCurriculum, aCurriculumSubject } from './testing/builders'

const NOW = new Date('2026-11-01T12:00:00.000Z')
const subject = (code: string, prerequisites: string | null = null) =>
  aCurriculumSubject({
    code,
    prerequisites: prerequisites
      ? { kind: 'subject', code: prerequisites }
      : null,
  })

const point = (overrides: Partial<ReviewPoint> = {}): ReviewPoint =>
  ({
    key: 'name:SBL0074',
    importId: 'i1',
    code: 'SBL0074',
    resolvedAt: null,
    type: 'SUBJECT_NAME_MISMATCH',
    catalogName: 'FÍSICA GERAL I',
    importedName: 'FÍSICA GERAL I (TEORIA)',
    resolution: null,
    ...overrides,
  }) as ReviewPoint

const workload = (hours: number) => ({
  workloadHours: hours,
  theoryHours: hours,
  labHours: 0,
  eadHours: 0,
  extensionHours: 0,
  credits: hours / 16,
})

const empty = { knownCodes: new Set<string>(), reviewPoints: [] }
const codes = (list: { code: string }[]) => list.map((item) => item.code)

describe('checkPublication', () => {
  it('EC coerente pode publicar', () => {
    const check = checkPublication(
      aCurriculum({
        branches: [aBranch({ id: 'b1' })],
        subjects: [
          subject('ECO0001'),
          aCurriculumSubject({
            code: 'ECO0002',
            prerequisites: { kind: 'subject', code: 'ECO0001' },
            branches: [{ branchId: 'b1', nature: 'MANDATORY' }],
          }),
        ],
      }),
      empty,
    )
    expect(check).toEqual({ canPublish: true, errors: [], warnings: [] })
  })

  it('barra EC vazia, ciclo de pré-requisitos e vertente fora do lugar', () => {
    const check = checkPublication(
      aCurriculum({
        branches: [
          aBranch({ id: 'slope', name: 'Computação' }),
          aBranch({
            id: 'grupo',
            type: 'SPECIFIC_GROUP',
            name: 'Grupo',
            parentId: 'slope',
          }),
        ],
        subjects: [
          subject('ECO0001', 'ECO0002'),
          subject('ECO0002', 'ECO0001'),
        ],
      }),
      empty,
    )
    expect(check.canPublish).toBe(false)
    expect(codes(check.errors)).toEqual([
      'BRANCH_INVALID_PARENT',
      'REQUIREMENT_CYCLE',
    ])
    expect(check.errors[1]?.message).toContain('ECO0001, ECO0002')
    expect(codes(checkPublication(aCurriculum(), empty).errors)).toEqual([
      'NO_SUBJECTS',
    ])
  })

  it('aceita grupo dentro de ênfase', () => {
    const check = checkPublication(
      aCurriculum({
        branches: [
          aBranch({ id: 'enf', type: 'EMPHASIS' }),
          aBranch({ id: 'grupo', type: 'SPECIFIC_GROUP', parentId: 'enf' }),
        ],
        subjects: [
          aCurriculumSubject({
            branches: [{ branchId: 'grupo', nature: 'OPTATIVE' }],
          }),
        ],
      }),
      empty,
    )
    expect(check.errors).toEqual([])
  })

  it('pontos para revisar barram; sugestão de equivalência só avisa', () => {
    const check = checkPublication(
      aCurriculum({ subjects: [subject('ECO0001')] }),
      {
        knownCodes: new Set(),
        reviewPoints: [
          point(),
          point({ key: 'ok', resolution: 'KEEP_CATALOG', resolvedAt: NOW }),
          point({
            key: 'eq',
            type: 'EQUIVALENCES_SUGGESTED',
            suggested: { kind: 'subject', code: 'CEC0058' },
            current: null,
          } as Partial<ReviewPoint>),
        ],
      },
    )
    expect(codes(check.errors)).toEqual(['UNRESOLVED_REVIEW_POINT'])
    expect(codes(check.warnings)).toEqual(['PENDING_EQUIVALENCE_SUGGESTION'])
  })

  it('sinaliza requisito fora do catálogo e vertente vazia', () => {
    const check = checkPublication(
      aCurriculum({
        branches: [aBranch({ id: 'b1', name: 'Telecom' })],
        subjects: [
          subject('ECO0101', 'CEC0058'),
          subject('ECO0102', 'SBL0084'),
        ],
      }),
      { knownCodes: new Set(['SBL0084']), reviewPoints: [] },
    )
    expect(check.canPublish).toBe(true)
    expect(check.warnings).toEqual([
      expect.objectContaining({
        code: 'UNKNOWN_REQUIREMENT_CODE',
        subjectCode: 'ECO0101',
      }),
      expect.objectContaining({ code: 'EMPTY_BRANCH' }),
    ])
  })
})

describe('resolveReviewPoint', () => {
  const ctx = { isAdmin: false, now: NOW }

  it('usar o nome do SIGAA renomeia a disciplina global', () => {
    const { point: resolved, effect } = resolveReviewPoint(
      point(),
      'USE_IMPORTED',
      ctx,
    )
    expect(resolved).toMatchObject({
      resolution: 'USE_IMPORTED',
      resolvedAt: NOW,
    })
    expect(isBlocking(resolved)).toBe(false)
    expect(effect).toEqual({
      kind: 'RENAME_SUBJECT',
      code: 'SBL0074',
      name: 'FÍSICA GERAL I (TEORIA)',
    })
    expect(resolveReviewPoint(point(), 'KEEP_CATALOG', ctx).effect).toBeNull()
  })

  it('usar a carga do SIGAA troca as cargas', () => {
    const { effect } = resolveReviewPoint(
      point({
        key: 'workload:SBL0074',
        type: 'SUBJECT_WORKLOAD_MISMATCH',
        catalog: workload(64),
        imported: workload(96),
      } as Partial<ReviewPoint>),
      'USE_IMPORTED',
      ctx,
    )
    expect(effect).toEqual({
      kind: 'SET_WORKLOAD',
      code: 'SBL0074',
      workload: workload(96),
    })
  })

  it('requisito fora do catálogo só pede ciência', () => {
    const unknown = point({
      key: 'unknown',
      type: 'UNKNOWN_REQUIREMENT_CODE',
      requiredCode: 'CEC0058',
    } as Partial<ReviewPoint>)
    expect(resolveReviewPoint(unknown, 'ACKNOWLEDGED', ctx).effect).toBeNull()
    expect(() => resolveReviewPoint(unknown, 'USE_IMPORTED', ctx)).toThrow(
      expect.objectContaining({ code: 'REVIEW_POINT_INVALID_RESOLUTION' }),
    )
  })

  it('equivalência sugerida: só admin aplica', () => {
    const suggestion = point({
      key: 'eq',
      type: 'EQUIVALENCES_SUGGESTED',
      suggested: { kind: 'subject', code: 'CEC0058' },
      current: null,
    } as Partial<ReviewPoint>)
    expect(() => resolveReviewPoint(suggestion, 'APPLY', ctx)).toThrow(
      expect.objectContaining({ code: 'ACCESS_DENIED' }),
    )
    expect(
      resolveReviewPoint(suggestion, 'APPLY', { isAdmin: true, now: NOW })
        .effect,
    ).toEqual({
      kind: 'SET_EQUIVALENCES',
      code: 'SBL0074',
      equivalences: { kind: 'subject', code: 'CEC0058' },
    })
    expect(
      resolveReviewPoint(suggestion, 'IGNORE', { isAdmin: true, now: NOW })
        .effect,
    ).toBeNull()
  })

  it('ponto já resolvido', () => {
    expect(() =>
      resolveReviewPoint(
        point({ resolution: 'KEEP_CATALOG', resolvedAt: NOW }),
        'USE_IMPORTED',
        ctx,
      ),
    ).toThrow(
      expect.objectContaining({ code: 'REVIEW_POINT_ALREADY_RESOLVED' }),
    )
  })
})
