import type {
  ActivityKind,
  CurriculumNature,
  RecordStatus,
  SigaaCourseModality,
} from '@ufc-flow/academic-core'
import { describe, expect, expectTypeOf, it } from 'vitest'
import type { z } from 'zod'

import {
  activityKindSchema,
  branchTypeSchema,
  courseRecognitionSchema,
  curriculumImportSourceSchema,
  curriculumImportStatusSchema,
  curriculumNatureSchema,
  curriculumStatusSchema,
  enrollmentStatusSchema,
  eventModalitySchema,
  linkBadgeSchema,
  linkButtonShapeSchema,
  linkButtonStyleSchema,
  linkKindSchema,
  linkPageThemeSchema,
  linkTitleFontSchema,
  linkTrafficSourceSchema,
  moderatorRequestStatusSchema,
  postStatusSchema,
  postTypeSchema,
  recordStatusSchema,
  sigaaCourseModalitySchema,
  socialNetworkSchema,
  subjectTypeSchema,
  userRoleSchema,
  userStatusSchema,
} from './enums'

describe('enums', () => {
  it('seguem os tipos do academic-core (D29)', () => {
    expectTypeOf<
      z.infer<typeof recordStatusSchema>
    >().toEqualTypeOf<RecordStatus>()
    expectTypeOf<
      z.infer<typeof curriculumNatureSchema>
    >().toEqualTypeOf<CurriculumNature>()
    expectTypeOf<
      z.infer<typeof activityKindSchema>
    >().toEqualTypeOf<ActivityKind>()
    expectTypeOf<
      z.infer<typeof sigaaCourseModalitySchema>
    >().toEqualTypeOf<SigaaCourseModality>()
  })

  it.each([
    [
      recordStatusSchema,
      [
        'CURSANDO',
        'APROVADO',
        'REPROVADO',
        'TRANCADA',
        'SUPRIMIDA',
        'APROVEITADA',
      ],
    ],
    [curriculumNatureSchema, ['MANDATORY', 'OPTATIVE']],
    [activityKindSchema, ['COMPLEMENTARY', 'EXTENSION']],
    [
      subjectTypeSchema,
      [
        'DISCIPLINE',
        'COMPLEMENTARY_ACTIVITY',
        'FINAL_PROJECT',
        'INTERNSHIP',
        'EXTENSION_UNIT',
        'MODULE',
        'ADVANCED_TOPIC',
        'SEMINAR',
        'TUTORING',
        'INTEGRATIVE_ACTIVITY',
        'OTHER',
      ],
    ],
    [sigaaCourseModalitySchema, ['IN_PERSON', 'DISTANCE']],
    [courseRecognitionSchema, ['SELECTED', 'MATCHED', 'MANUAL']],
    [branchTypeSchema, ['SLOPE', 'EMPHASIS', 'SPECIFIC_GROUP']],
    [curriculumStatusSchema, ['DRAFT', 'PUBLISHED']],
    [
      enrollmentStatusSchema,
      ['ACTIVE', 'TRANSFERRED', 'CONCLUDED', 'CANCELED'],
    ],
    [userRoleSchema, ['ADMIN']],
    [userStatusSchema, ['ACTIVE', 'SUSPENDED']],
    [
      moderatorRequestStatusSchema,
      ['PENDING', 'APPROVED', 'REJECTED', 'CANCELED'],
    ],
    [curriculumImportSourceSchema, ['EXTENSION', 'UPLOAD']],
    [
      curriculumImportStatusSchema,
      ['RECEIVED', 'APPLIED', 'FAILED', 'DISCARDED'],
    ],
    [
      postTypeSchema,
      ['NEWS', 'EVENT', 'SCHOLARSHIP', 'EXTENSION_PROJECT', 'CALL'],
    ],
    [postStatusSchema, ['DRAFT', 'PUBLISHED', 'ARCHIVED']],
    [eventModalitySchema, ['IN_PERSON', 'ONLINE', 'HYBRID']],
    [linkKindSchema, ['URL', 'FILE', 'INTERNAL', 'POST']],
    [linkBadgeSchema, ['NONE', 'NEW']],
    [
      linkPageThemeSchema,
      ['CIANO', 'LARANJA', 'VERDE', 'VIOLETA', 'BRANCO', 'ESCURO'],
    ],
    [linkButtonStyleSchema, ['FILLED', 'OUTLINE', 'SOFT']],
    [linkButtonShapeSchema, ['SQUARE', 'ROUNDED', 'PILL']],
    [linkTitleFontSchema, ['CLASH', 'GEIST']],
    [
      socialNetworkSchema,
      ['INSTAGRAM', 'EMAIL', 'WHATSAPP', 'YOUTUBE', 'SITE', 'OUTRO'],
    ],
    [linkTrafficSourceSchema, ['PAGE', 'QR', 'HUB']],
  ] as const)('%# tem os valores da modelagem', (schema, values) => {
    expect(schema.options).toEqual(values)
    expect(schema.safeParse(values[0]).success).toBe(true)
    expect(schema.safeParse('INEXISTENTE').success).toBe(false)
  })
})
