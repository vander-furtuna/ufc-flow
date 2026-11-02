import { z } from 'zod'

import {
  instructorSchema,
  isoDateSchema,
  sectionSlotSchema,
} from '../classes/classes'
import {
  isoDateTimeSchema,
  slugSchema,
  subjectCodeSchema,
  termSchema,
  uuidSchema,
} from '../common/primitives'

// Paleta da agenda do web (o web antigo grava "fuschia"; a importação
// converte para "fuchsia")
export const scheduleColorSchema = z
  .enum([
    'red',
    'orange',
    'lime',
    'green',
    'emerald',
    'teal',
    'cyan',
    'blue',
    'violet',
    'fuchsia',
    'pink',
    'rose',
  ])
  .meta({ id: 'ScheduleColor' })

// Limites de uma agenda: cabe com folga no semestre mais cheio
export const SCHEDULE_MAX_ITEMS = 40
export const SCHEDULES_MAX_PER_IMPORT = 50

const scheduleNameSchema = z
  .string()
  .trim()
  .min(1, 'Dê um nome à agenda')
  .max(60, 'Use até 60 caracteres')

// Turma na agenda, com os dados atuais da coleta e os avisos
export const scheduleItemSchema = z
  .object({
    sectionId: uuidSchema,
    subjectCode: subjectCodeSchema,
    subjectName: z.string(),
    sectionCode: z.string(),
    color: scheduleColorSchema,
    instructors: z.array(instructorSchema),
    slots: z.array(sectionSlotSchema),
    validFrom: isoDateSchema.nullable(),
    validTo: isoDateSchema.nullable(),
    addedAt: isoDateTimeSchema,
    // Horário ou docentes mudaram no SIGAA depois que a turma entrou
    changed: z.boolean(),
    // A turma saiu do SIGAA
    removed: z.boolean(),
  })
  .meta({ id: 'ScheduleItem' })

// Agenda de um curso, numa EC e num semestre (D71)
export const scheduleSchema = z
  .object({
    id: uuidSchema,
    courseSlug: slugSchema,
    curriculumSlug: slugSchema,
    term: termSchema,
    name: z.string(),
    position: z.int().nonnegative(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    items: z.array(scheduleItemSchema),
  })
  .meta({ id: 'Schedule' })

export const scheduleListQuerySchema = z
  .object({
    course: slugSchema.optional(),
    curriculum: slugSchema.optional(),
    term: termSchema.optional(),
  })
  .meta({ id: 'ScheduleListQuery' })

export const scheduleItemInputSchema = z
  .object({
    sectionId: uuidSchema,
    color: scheduleColorSchema,
    // Dispensa o aviso de horário alterado
    acknowledgeChange: z.boolean().optional(),
  })
  .meta({ id: 'ScheduleItemInput' })

// A agenda é gravada inteira (PUT); a última escrita vale
export const scheduleInputSchema = z
  .object({
    courseSlug: slugSchema,
    curriculumSlug: slugSchema,
    term: termSchema,
    name: scheduleNameSchema,
    position: z.int().nonnegative().default(0),
    items: z.array(scheduleItemInputSchema).max(SCHEDULE_MAX_ITEMS),
  })
  .meta({ id: 'ScheduleInput' })

// Importação das agendas locais (IndexedDB) no primeiro login. O UUID local
// vira o id da agenda, então reenviar não duplica.
export const scheduleImportItemSchema = z
  .object({
    subjectCode: subjectCodeSchema,
    sectionCode: z.string().min(1).max(10),
    color: scheduleColorSchema,
  })
  .meta({ id: 'ScheduleImportItem' })

export const scheduleImportEntrySchema = z
  .object({
    id: uuidSchema,
    courseSlug: slugSchema,
    curriculumSlug: slugSchema,
    term: termSchema,
    name: scheduleNameSchema,
    items: z.array(scheduleImportItemSchema).max(SCHEDULE_MAX_ITEMS),
  })
  .meta({ id: 'ScheduleImportEntry' })

export const scheduleImportInputSchema = z
  .object({
    schedules: z
      .array(scheduleImportEntrySchema)
      .min(1)
      .max(SCHEDULES_MAX_PER_IMPORT),
  })
  .meta({ id: 'ScheduleImportInput' })

export const scheduleImportStatusSchema = z.enum([
  'IMPORTED',
  'ALREADY_IMPORTED',
  'FAILED',
])

export const scheduleImportResultSchema = z
  .object({
    id: uuidSchema,
    status: scheduleImportStatusSchema,
    // Por que a agenda inteira não entrou (curso, EC ou semestre)
    error: z.object({ code: z.string(), detail: z.string() }).nullable(),
    // Turmas que não existem no semestre coletado
    notFound: z.array(
      z.object({ subjectCode: z.string(), sectionCode: z.string() }),
    ),
    // Turmas que existem, mas repetem a disciplina ou conflitam no horário
    skipped: z.array(
      z.object({
        subjectCode: z.string(),
        sectionCode: z.string(),
        reason: z.enum([
          'SCHEDULE_DUPLICATE_SUBJECT',
          'SCHEDULE_TIME_CONFLICT',
        ]),
      }),
    ),
    schedule: scheduleSchema.nullable(),
  })
  .meta({ id: 'ScheduleImportResult' })

export const scheduleImportResponseSchema = z
  .object({ results: z.array(scheduleImportResultSchema) })
  .meta({ id: 'ScheduleImportResponse' })

export type ScheduleColor = z.infer<typeof scheduleColorSchema>
export type ScheduleItemView = z.infer<typeof scheduleItemSchema>
export type ScheduleView = z.infer<typeof scheduleSchema>
export type ScheduleListQuery = z.infer<typeof scheduleListQuerySchema>
export type ScheduleItemInput = z.infer<typeof scheduleItemInputSchema>
export type ScheduleInput = z.infer<typeof scheduleInputSchema>
export type ScheduleImportItem = z.infer<typeof scheduleImportItemSchema>
export type ScheduleImportEntry = z.infer<typeof scheduleImportEntrySchema>
export type ScheduleImportInput = z.infer<typeof scheduleImportInputSchema>
export type ScheduleImportResult = z.infer<typeof scheduleImportResultSchema>
export type ScheduleImportResponse = z.infer<
  typeof scheduleImportResponseSchema
>
