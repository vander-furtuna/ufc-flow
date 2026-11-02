import type { Weekday } from '@ufc-flow/academic-core'
import { z } from 'zod'

import {
  isoDateTimeSchema,
  slugSchema,
  subjectCodeSchema,
  termSchema,
  uuidSchema,
} from '../common/primitives'

// Data sem hora (YYYY-MM-DD), como o SIGAA mostra a vigência
export const isoDateSchema = z.iso.date()

// Dia da semana ISO 8601: 1 = segunda ... 7 = domingo (D24)
export const weekdaySchema: z.ZodType<Weekday> = z
  .int()
  .min(1)
  .max(7)
  .meta({ id: 'Weekday' }) as unknown as z.ZodType<Weekday>

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida (HH:MM)')

export const academicTermSchema = z
  .object({
    id: uuidSchema,
    code: termSchema,
    startsAt: isoDateSchema,
    endsAt: isoDateSchema,
    isCurrent: z.boolean(),
  })
  .meta({ id: 'AcademicTerm' })

export const academicTermInputSchema = z
  .object({
    code: termSchema,
    startsAt: isoDateSchema,
    endsAt: isoDateSchema,
  })
  .refine((term) => term.startsAt < term.endsAt, {
    message: 'O fim precisa ser depois do início',
    path: ['endsAt'],
  })
  .meta({ id: 'AcademicTermInput' })

export const updateAcademicTermInputSchema = z
  .object({ startsAt: isoDateSchema, endsAt: isoDateSchema })
  .refine((term) => term.startsAt < term.endsAt, {
    message: 'O fim precisa ser depois do início',
    path: ['endsAt'],
  })
  .meta({ id: 'UpdateAcademicTermInput' })

export const instructorSchema = z
  .object({ siape: z.string(), name: z.string(), profileUrl: z.string() })
  .meta({ id: 'Instructor' })

export const sectionSlotSchema = z
  .object({
    weekday: weekdaySchema,
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .meta({ id: 'SectionSlot' })

// Turma como o web mostra: id estável (chave natural no banco), horários
// semanais e fingerprint para a agenda perceber mudança de horário
export const classSectionSchema = z
  .object({
    id: uuidSchema,
    subjectCode: subjectCodeSchema,
    sectionCode: z.string(),
    instructors: z.array(instructorSchema),
    reservedSeats: z.int().nonnegative(),
    slots: z.array(sectionSlotSchema),
    validFrom: isoDateSchema.nullable(),
    validTo: isoDateSchema.nullable(),
    fingerprint: z.string(),
  })
  .meta({ id: 'ClassSection' })

export const subjectSectionsSchema = z
  .object({
    code: subjectCodeSchema,
    name: z.string(),
    sections: z.array(classSectionSchema),
  })
  .meta({ id: 'SubjectSections' })

export const courseSectionsSchema = z
  .object({
    term: termSchema,
    courseSlug: slugSchema,
    // Última coleta bem-sucedida; nulo enquanto o curso não foi coletado
    collectedAt: isoDateTimeSchema.nullable(),
    subjects: z.array(subjectSectionsSchema),
  })
  .meta({ id: 'CourseSections' })

export const scrapeTriggerSchema = z.enum(['SCHEDULED', 'MANUAL'])
export const scrapeStatusSchema = z.enum(['RUNNING', 'SUCCESS', 'FAILED'])

export const scrapeRunSchema = z
  .object({
    id: uuidSchema,
    courseSlug: slugSchema,
    term: termSchema,
    trigger: scrapeTriggerSchema,
    status: scrapeStatusSchema,
    startedAt: isoDateTimeSchema,
    finishedAt: isoDateTimeSchema.nullable(),
    sectionsSeen: z.int().nonnegative(),
    sectionsChanged: z.int().nonnegative(),
    error: z.string().nullable(),
  })
  .meta({ id: 'ScrapeRun' })

export type AcademicTerm = z.infer<typeof academicTermSchema>
export type AcademicTermInput = z.infer<typeof academicTermInputSchema>
export type UpdateAcademicTermInput = z.infer<
  typeof updateAcademicTermInputSchema
>
export type Instructor = z.infer<typeof instructorSchema>
export type SectionSlot = z.infer<typeof sectionSlotSchema>
export type ClassSectionView = z.infer<typeof classSectionSchema>
export type SubjectSections = z.infer<typeof subjectSectionsSchema>
export type CourseSections = z.infer<typeof courseSectionsSchema>
export type ScrapeTrigger = z.infer<typeof scrapeTriggerSchema>
export type ScrapeStatus = z.infer<typeof scrapeStatusSchema>
export type ScrapeRun = z.infer<typeof scrapeRunSchema>
