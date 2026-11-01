import {
  normalizeSearchText,
  parseRequirement,
  type RequirementExpr,
} from '@ufc-flow/academic-core'
import {
  curriculumImportV1Schema,
  validationProblem,
  type CourseRecognition,
  type CurriculumImportV1,
  type SubjectType,
  type ValidationError,
} from '@ufc-flow/contracts'

import type {
  CurriculumPage,
  PageComponent,
  PageGroup,
} from './read-curriculum-page'

export type ImportContext = {
  course: { sigaaId: string; name: string; recognition: CourseRecognition }
  curriculumSigaaId: string | null
  extractedAt: string
  url: string | null
}

// O que a extensão leu mas não entendeu. Não impede o JSON: aparece na aba
// Revisar para o moderador conferir.
export type ConversionWarning = {
  code:
    'REQUIREMENT_UNREADABLE' | 'UNKNOWN_SUBJECT_TYPE' | 'BRANCH_MEMBER_OUTSIDE'
  subjectCode: string
  field?: 'prerequisites' | 'corequisites' | 'equivalences'
  text: string
  message: string
}

export type ConversionResult = {
  data: CurriculumImportV1 | null
  issues: ValidationError[]
  warnings: ConversionWarning[]
}

type Subject = CurriculumImportV1['subjects'][number]
type Branch = CurriculumImportV1['branches'][number]

const TYPES: [RegExp, SubjectType][] = [
  [/^DISCIPLINA/, 'DISCIPLINE'],
  [/^ATIVIDADES? COMPLEMENTAR/, 'COMPLEMENTARY_ACTIVITY'],
  [/^ATIVIDADES? INTEGRADORAS?/, 'INTEGRATIVE_ACTIVITY'],
  [/^TRABALHO (DE CONCLUSAO DE CURSO|DE FINAL DE GRADUACAO)/, 'FINAL_PROJECT'],
  [/^ESTAGIO/, 'INTERNSHIP'],
  [/^UNIDADE (CURRICULAR )?ESPECIAL DE EXTENSAO/, 'EXTENSION_UNIT'],
  [/^MODULO/, 'MODULE'],
  [/^TOPICO AVANCADO/, 'ADVANCED_TOPIC'],
  [/^SEMINARIO/, 'SEMINAR'],
  [/^TUTORIA/, 'TUTORING'],
]

// Tipo do componente pelo texto do SIGAA (D30); null se desconhecido
export function mapSubjectType(label: string): SubjectType | null {
  const text = normalizeSearchText(label).toUpperCase().trim()
  return TYPES.find(([pattern]) => pattern.test(text))?.[1] ?? null
}

const slug = (text: string) =>
  normalizeSearchText(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const natureOf = (label: string): Subject['nature'] =>
  /obrigat/i.test(normalizeSearchText(label)) ? 'MANDATORY' : 'OPTATIVE'

export function toCurriculumImport(
  page: CurriculumPage,
  context: ImportContext,
): ConversionResult {
  const warnings: ConversionWarning[] = []

  const requirement = (
    component: PageComponent,
    field: NonNullable<ConversionWarning['field']>,
    text: string,
  ): RequirementExpr | null => {
    const result = parseRequirement(text)
    if (result.ok) return result.expr
    warnings.push({
      code: 'REQUIREMENT_UNREADABLE',
      subjectCode: component.code,
      field,
      text,
      message: result.error.message,
    })
    return null
  }

  const subjects: Subject[] = page.components.map((component) => {
    const type = mapSubjectType(component.typeLabel)
    if (!type) {
      warnings.push({
        code: 'UNKNOWN_SUBJECT_TYPE',
        subjectCode: component.code,
        text: component.typeLabel,
        message: `Tipo "${component.typeLabel}" desconhecido; vai como OTHER`,
      })
    }
    return {
      code: component.code,
      name: component.name,
      type: type ?? 'OTHER',
      semester: component.semester,
      durationTerms: component.durationTerms,
      workloadHours: component.workloadHours,
      theoryHours: component.theoryHours,
      labHours: component.labHours,
      eadHours: component.eadHours,
      extensionHours: component.extensionHours,
      credits: component.credits,
      nature: natureOf(component.natureLabel),
      prerequisites: requirement(
        component,
        'prerequisites',
        component.prerequisitesText,
      ),
      corequisites: requirement(
        component,
        'corequisites',
        component.corequisitesText,
      ),
      equivalences: requirement(
        component,
        'equivalences',
        component.equivalencesText,
      ),
      branches: [],
    }
  })

  const byCode = new Map(subjects.map((item) => [item.code, item]))
  const link = (code: string, key: string, nature?: Subject['nature']) => {
    const subject = byCode.get(code)
    if (!subject) {
      warnings.push({
        code: 'BRANCH_MEMBER_OUTSIDE',
        subjectCode: code,
        text: key,
        message: `${code} está na vertente ${key}, mas não nas tabelas de componentes`,
      })
      return
    }
    subject.branches.push({ key, nature: nature ?? subject.nature })
  }

  const branches: Branch[] = []
  const keys = new Set<string>()
  const uniqueKey = (base: string) => {
    let key = base
    for (let n = 2; keys.has(key); n++) key = `${base}-${n}`
    keys.add(key)
    return key
  }

  const addGroup = (group: PageGroup, parentKey: string | null) => {
    const key = uniqueKey(`group-${slug(group.name)}`)
    branches.push({
      key,
      parentKey,
      type: 'SPECIFIC_GROUP',
      name: group.name,
      description: null,
      sigaaCode: null,
      color: null,
      mandatoryHours: null,
      minHours: group.minHours,
      maxHours: group.maxHours,
      minComponents: group.minComponents,
      maxComponents: group.maxComponents,
    })
    for (const code of group.members) link(code, key)
  }

  for (const emphasis of page.emphases) {
    const key = uniqueKey(
      `emphasis-${slug(emphasis.sigaaCode || emphasis.name)}`,
    )
    branches.push({
      key,
      parentKey: null,
      type: 'EMPHASIS',
      name: emphasis.name,
      description: null,
      sigaaCode: emphasis.sigaaCode || null,
      color: null,
      mandatoryHours: emphasis.mandatoryHours,
      minHours: emphasis.minOptativeHours,
      maxHours: null,
      minComponents: null,
      maxComponents: null,
    })
    for (const member of emphasis.members) {
      link(member.code, key, natureOf(member.natureLabel))
    }
    for (const group of emphasis.groups) addGroup(group, key)
  }
  for (const group of page.groups) addGroup(group, null)

  const { header } = page
  const draft = {
    schemaVersion: 1,
    source: { extractedAt: context.extractedAt, url: context.url },
    course: context.course,
    curriculum: {
      code: header.code,
      effectiveTerm: header.effectiveTerm,
      sigaaId: context.curriculumSigaaId,
      matrixName: header.matrixName,
      unitName: header.unitName,
      city: header.city,
      minTotalHours: header.minTotalHours,
      maxTotalHours: header.maxTotalHours,
      mandatoryHours: header.mandatoryHours,
      optativeHours: header.optativeHours,
      extensionHours: header.extensionHours,
      specificActivityHours: header.specificActivityHours,
      maxFreeOptativeHours: header.maxFreeOptativeHours,
      minPeriods: header.minPeriods,
      avgPeriods: header.avgPeriods,
      maxPeriods: header.maxPeriods,
      periodMinHours: header.periodMinHours,
      periodAvgHours: header.periodAvgHours,
      periodMaxHours: header.periodMaxHours,
      minEmphases: header.minEmphases,
      maxEmphases: header.maxEmphases,
    },
    branches,
    subjects,
  }

  const result = curriculumImportV1Schema.safeParse(draft)
  return result.success
    ? { data: result.data, issues: [], warnings }
    : {
        data: null,
        issues: validationProblem(result.error).errors ?? [],
        warnings,
      }
}
