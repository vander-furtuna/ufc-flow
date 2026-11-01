import { describe, expect, it } from 'vitest'

import { checkScheduleAddition, validateSchedule } from './schedule-rules'
import type { ScheduleSection, TimeSlot } from './types'

const slot = (
  weekday: TimeSlot['weekday'],
  startTime: string,
  endTime: string,
): TimeSlot => ({ weekday, startTime, endTime })

const section = (
  id: string,
  subjectCode: string,
  ...slots: TimeSlot[]
): ScheduleSection => ({ id, subjectCode, slots })

const calculo = section('t1', 'ECO0001', slot(2, '08:00', '10:00'))
const programacao = section('t2', 'ECO0002', slot(2, '10:00', '12:00'))
const fisica = section('t3', 'SBL0056', slot(4, '08:00', '10:00'))

describe('validateSchedule', () => {
  it('aceita uma agenda sem repetição e sem conflito', () => {
    expect(validateSchedule([calculo, programacao, fisica])).toEqual([])
  })

  it('aceita uma agenda vazia', () => {
    expect(validateSchedule([])).toEqual([])
  })

  it('no máximo uma turma por disciplina', () => {
    const outraTurma = section('t9', 'ECO0001', slot(5, '08:00', '10:00'))
    expect(validateSchedule([calculo, programacao, outraTurma])).toEqual([
      {
        code: 'SCHEDULE_DUPLICATE_SUBJECT',
        subjectCode: 'ECO0001',
        sectionIds: ['t1', 't9'],
      },
    ])
  })

  it('nenhum conflito de horário', () => {
    const conflitante = section('t4', 'ECO0003', slot(2, '09:00', '11:00'))
    expect(validateSchedule([calculo, programacao, conflitante])).toEqual([
      { code: 'SCHEDULE_TIME_CONFLICT', sectionIds: ['t1', 't4'] },
      { code: 'SCHEDULE_TIME_CONFLICT', sectionIds: ['t2', 't4'] },
    ])
  })

  it('aponta as duas regras quando as duas são violadas', () => {
    const mesmaDisciplinaMesmoHorario = section(
      't5',
      'ECO0001',
      slot(2, '08:00', '10:00'),
    )
    expect(validateSchedule([calculo, mesmaDisciplinaMesmoHorario])).toEqual([
      {
        code: 'SCHEDULE_DUPLICATE_SUBJECT',
        subjectCode: 'ECO0001',
        sectionIds: ['t1', 't5'],
      },
      { code: 'SCHEDULE_TIME_CONFLICT', sectionIds: ['t1', 't5'] },
    ])
  })
})

describe('checkScheduleAddition', () => {
  it('aceita uma turma nova sem conflito', () => {
    expect(checkScheduleAddition([calculo, programacao], fisica)).toEqual([])
  })

  it('recusa outra turma de uma disciplina que já está na agenda', () => {
    const outraTurma = section('t9', 'ECO0001', slot(6, '08:00', '10:00'))
    expect(checkScheduleAddition([calculo, programacao], outraTurma)).toEqual([
      {
        code: 'SCHEDULE_DUPLICATE_SUBJECT',
        subjectCode: 'ECO0001',
        sectionIds: ['t1', 't9'],
      },
    ])
  })

  it('recusa uma turma que conflita com a agenda', () => {
    const conflitante = section('t4', 'ECO0003', slot(2, '11:00', '13:00'))
    expect(checkScheduleAddition([calculo, programacao], conflitante)).toEqual([
      { code: 'SCHEDULE_TIME_CONFLICT', sectionIds: ['t2', 't4'] },
    ])
  })

  it('não acusa a turma que já está na agenda', () => {
    expect(checkScheduleAddition([calculo, programacao], calculo)).toEqual([])
  })
})
