export type Nature =
  | 'OBRIGATÓRIA'
  | 'OPTATIVA'
  | 'ATIVIDADE COMPLEMENTAR'
  | 'EXTENSÃO'
  | 'ESTÁGIO'
  | 'TCC'
  | 'MÓDULO'
  | 'TÓPICO ESPECIAL'
  | 'OUTRO'

export type SubjectType =
  | 'DISCIPLINA'
  | 'ATIVIDADE COMPLEMENTAR'
  | 'TRABALHO DE CONCLUSÃO DE CURSO'
  | 'ESTÁGIO'
  | 'UNIDADE CURRICULAR ESPECIAL DE EXTENSÃO'
  | 'MÓDULO'
  | 'TÓPICO AVANÇADO'
  | 'SEMINÁRIO'
  | 'TUTORIA'
  | 'OUTRO'

export type BranchType = 'EMPHASIS' | 'SPECIFIC_GROUP' | 'SLOPE'

export type Branch = {
  id: string
  name: string
  color: string
  type?: BranchType
  parentBranchId?: string
  minHours?: number
  minComponents?: number
}

export type Subject = {
  id: string
  code: string
  name: string
  semester: number
  duration: number
  nature: Nature
  type: SubjectType
  branch: string[]
  prerequisites: string[]
  equivalences: string[]
  corequisites: string[]
  slug: string
  details?: {
    aula: number
    lab: number
    ead: number
    ext: number
    cr: number
  }
  branchRelations?: {
    branchId: string
    nature: Nature
  }[]
}

export type CurriculumStructure = {
  id: string
  period: string
  slug: string
  city: string
  minTotalHours: number
  maxTotalHours?: number
  mandatoryHours?: number
  optativeHours?: number
  extensionHours?: number
  mandatoryAcademicActivityHours?: number
  maxOptativeFreeHours?: number
  minPeriods?: number
  avgPeriods?: number
  maxPeriods?: number
  periodHours?: {
    min: number
    avg: number
    max: number
  }
  branchs: Branch[]
  subjects: Subject[]
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") 
    .replace(/[^a-z0-9 -]/g, "") 
    .replace(/\s+/g, "-") 
    .replace(/-+/g, "-") 
    .replace(/^-+/, "") 
    .replace(/-+$/, ""); 
}

function generateUniqueId(code: string): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
  } catch {}
  return code + '-' + Math.random().toString(36).substring(2, 9)
}

function mapSubjectType(rawType: string): SubjectType {
  const clean = rawType.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
  if (clean.includes('DISCIPLINA')) return 'DISCIPLINA'
  if (clean.includes('ATIVIDADE COMPLEMENTAR') || clean.includes('ATIVIDADES COMPLEMENTARES')) return 'ATIVIDADE COMPLEMENTAR'
  if (clean.includes('TRABALHO DE CONCLUSÃO DE CURSO') || clean.includes('TRABALHO DE CONCLUSAO DE CURSO') || clean.includes('TRABALHO DE FINAL DE GRADUACAO')) return 'TRABALHO DE CONCLUSÃO DE CURSO'
  if (clean.includes('ESTÁGIO') || clean.includes('ESTAGIO')) return 'ESTÁGIO'
  if (clean.includes('UNIDADE CURRICULAR ESPECIAL DE EXTENSÃO') || clean.includes('UNIDADE CURRICULAR ESPECIAL DE EXTENSAO') || clean.includes('UNIDADE ESPECIAL DE EXTENSÃO') || clean.includes('UNIDADE ESPECIAL DE EXTENSAO')) return 'UNIDADE CURRICULAR ESPECIAL DE EXTENSÃO'
  if (clean.includes('MÓDULO') || clean.includes('MODULO')) return 'MÓDULO'
  if (clean.includes('TÓPICO AVANÇADO') || clean.includes('TOPICO AVANCADO')) return 'TÓPICO AVANÇADO'
  if (clean.includes('SEMINÁRIO') || clean.includes('SEMINARIO')) return 'SEMINÁRIO'
  if (clean.includes('TUTORIA')) return 'TUTORIA'
  return 'OUTRO'
}

function mapNature(rawNature: string, subjectType: SubjectType): Nature {
  const clean = rawNature.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
  
  if (subjectType === 'ATIVIDADE COMPLEMENTAR') return 'ATIVIDADE COMPLEMENTAR'
  if (subjectType === 'ESTÁGIO') return 'ESTÁGIO'
  if (subjectType === 'TRABALHO DE CONCLUSÃO DE CURSO') return 'TCC'
  if (subjectType === 'UNIDADE CURRICULAR ESPECIAL DE EXTENSÃO') return 'EXTENSÃO'
  if (subjectType === 'MÓDULO') return 'MÓDULO'
  if (subjectType === 'TÓPICO AVANÇADO') return 'TÓPICO ESPECIAL'
  
  if (clean.includes('OBRIGATORIA')) return 'OBRIGATÓRIA'
  if (clean.includes('OPTATIVA')) return 'OPTATIVA'
  
  return 'OUTRO'
}

function parseSubjectDetails(td: Element, titleRaw: string): Subject['details'] {
  const html = td.innerHTML || ''
  
  const aulaMatch = html.match(/(\d+)\s*h\s*aula/i)
  const labMatch = html.match(/(\d+)\s*h\s*lab/i)
  const eadMatch = html.match(/(\d+)\s*h\s*ead/i)
  const extMatch = html.match(/(\d+)\s*h\s*ext/i)
  
  let cr = 0
  const crMatches = Array.from(html.matchAll(/(\d+)\s*cr/ig))
  if (crMatches.length > 0) {
    cr = crMatches.reduce((sum, match) => sum + parseInt(match[1], 10), 0)
  } else {
    const titleCrMatch = titleRaw.match(/\((\d+)\s*cr\)/i)
    if (titleCrMatch) {
      cr = parseInt(titleCrMatch[1], 10)
    }
  }

  return {
    aula: aulaMatch ? parseInt(aulaMatch[1], 10) : 0,
    lab: labMatch ? parseInt(labMatch[1], 10) : 0,
    ead: eadMatch ? parseInt(eadMatch[1], 10) : 0,
    ext: extMatch ? parseInt(extMatch[1], 10) : 0,
    cr: Number.isNaN(cr) ? 0 : cr
  }
}

function parseSubjectNameAndDuration(text: string, codeStr?: string): { name: string; duration: number } {
  const cleanText = text.replace(/\s+/g, ' ').trim()
  const durationMatch = cleanText.match(/\b(\d+)\s*(?:h|hrs)\b/i)
  
  let duration = 64
  let name = cleanText
  
  if (durationMatch && durationMatch.index !== undefined) {
    duration = parseInt(durationMatch[1], 10)
    let beforeMatch = cleanText.slice(0, durationMatch.index).trim()
    beforeMatch = beforeMatch.replace(/\s*-\s*$/, '').trim()
    if (beforeMatch) {
      name = beforeMatch
    }
  }
  
  if (codeStr && name.startsWith(codeStr)) {
    name = name.slice(codeStr.length).trim()
    name = name.replace(/^\s*-\s*/, '').trim()
  }
  
  return { name, duration }
}

export function parseCurriculum(doc: Document): CurriculumStructure | null {
  const summaryTable = doc.querySelector('table.formulario')
  if (!summaryTable) return null

  let code = ''
  let name = ''
  let city = ''
  let minTotalHours = 0
  let period = ''

  let maxTotalHours: number | undefined = undefined
  let mandatoryHours: number | undefined = undefined
  let optativeHours: number | undefined = undefined
  let extensionHours: number | undefined = undefined
  let mandatoryAcademicActivityHours: number | undefined = undefined
  let maxOptativeFreeHours: number | undefined = undefined
  
  let minPeriods: number | undefined = undefined
  let avgPeriods: number | undefined = undefined
  let maxPeriods: number | undefined = undefined
  let periodHours: CurriculumStructure['periodHours'] = undefined

  function findNestedTableValue(td: Element, headerText: string): number | undefined {
    const headers = Array.from(td.querySelectorAll('th'))
    const header = headers.find(h => h.textContent?.trim().includes(headerText))
    if (header) {
      const siblingTd = header.nextElementSibling
      if (siblingTd && siblingTd.tagName.toLowerCase() === 'td') {
        return parseInt(siblingTd.textContent?.trim() || '0', 10)
      }
    }
    return undefined
  }

  const rows = summaryTable.querySelectorAll('tbody > tr')
  rows.forEach((row) => {
    const th = row.querySelector('th')
    const td = row.querySelector('td')
    if (!th || !td) return

    const label = th.textContent?.trim() || ''
    const val = td.textContent?.trim() || ''

    if (label.includes('Código:')) {
      code = val
    } else if (label.includes('Matriz Curricular:')) {
      name = val
    } else if (label.includes('Município de funcionamento:')) {
      city = val
    } else if (label.includes('Período Letivo de Entrada em Vigor:')) {
      period = val.replace(/\s+/g, '')
    } else if (label.includes('Carga Horária:')) {
      const hrCell = td.querySelector('td')
      const targetText = hrCell ? hrCell.textContent : td.textContent
      minTotalHours = parseInt(targetText?.trim() || '0', 10)
    } else if (label.includes('Carga Horária Obrigatória:')) {
      const match = val.match(/(\d+)/)
      if (match) mandatoryHours = parseInt(match[1], 10)
    } else if (label.includes('Carga Horária de Extensão:')) {
      const match = val.match(/(\d+)/)
      if (match) extensionHours = parseInt(match[1], 10)
    } else if (label.includes('Carga Horária Optativa Minima:')) {
      const match = val.match(/(\d+)/)
      if (match) optativeHours = parseInt(match[1], 10)
    } else if (label.includes('Carga Horária Obrigatória de Atividade Acadêmica Específica:')) {
      const match = val.match(/(\d+)/)
      if (match) mandatoryAcademicActivityHours = parseInt(match[1], 10)
    } else if (label.includes('Carga Horária Máxima de Componentes Curriculares Optativos Livres:')) {
      const match = val.match(/(\d+)/)
      if (match) maxOptativeFreeHours = parseInt(match[1], 10)
    } else if (label.includes('Prazos para Conclusão em Períodos Letivos:')) {
      minPeriods = findNestedTableValue(td, 'Mínimo')
      avgPeriods = findNestedTableValue(td, 'Médio')
      maxPeriods = findNestedTableValue(td, 'Máximo')
    } else if (label.includes('Carga Horária por Período Letivo:')) {
      const minVal = findNestedTableValue(td, 'Mínima')
      const avgVal = findNestedTableValue(td, 'Média')
      const maxVal = findNestedTableValue(td, 'Máxima')
      if (minVal !== undefined || avgVal !== undefined || maxVal !== undefined) {
        periodHours = {
          min: minVal || 0,
          avg: avgVal || 0,
          max: maxVal || 0
        }
      }
    }
  })

  if (!period) period = code || '0000.0'

  const courseClean = name.split('/')[0]?.split(' - ')[0] || 'sigaa-curriculo'
  const slug = `${slugify(courseClean)}-${slugify(period)}`

  const subjectsTables = doc.querySelectorAll('table.subFormulario')
  if (subjectsTables.length === 0) return null

  const subjects: Subject[] = []
  const branchs: Branch[] = []
  let maxSemester = 1

  const BRANCH_COLORS = ['#38bdf8', '#a78bfa', '#ea580c', '#10b981', '#ec4899', '#3b82f6', '#14b8a6', '#f43f5e']

  function addOrUpdateSubject(
    subjectList: Subject[],
    subjectData: {
      code: string
      name: string
      semester: number
      duration: number
      nature: Nature
      type: SubjectType
      prerequisites: string[]
      equivalences: string[]
      corequisites: string[]
      slug: string
      details?: {
        aula: number
        lab: number
        ead: number
        ext: number
        cr: number
      }
    },
    branchId?: string,
    branchRelation?: { branchId: string; nature: Nature }
  ) {
    const existing = subjectList.find((s) => s.code === subjectData.code)
    if (existing) {
      if (subjectData.semester > 0 && (existing.semester === 0 || existing.semester > subjectData.semester)) {
        existing.semester = subjectData.semester
      }
      if (subjectData.duration > 0 && !existing.duration) {
        existing.duration = subjectData.duration
      }
      if (subjectData.nature === 'OBRIGATÓRIA' && existing.nature === 'OPTATIVA') {
        existing.nature = 'OBRIGATÓRIA'
      }
      if (branchId && !existing.branch.includes(branchId)) {
        existing.branch.push(branchId)
      }
      if (branchRelation) {
        if (!existing.branchRelations) {
          existing.branchRelations = []
        }
        if (!existing.branchRelations.some((r) => r.branchId === branchRelation.branchId)) {
          existing.branchRelations.push(branchRelation)
        }
      }
      subjectData.prerequisites?.forEach((p) => {
        if (!existing.prerequisites.includes(p)) existing.prerequisites.push(p)
      })
      subjectData.equivalences?.forEach((eq) => {
        if (!existing.equivalences.includes(eq)) existing.equivalences.push(eq)
      })
      subjectData.corequisites?.forEach((cr) => {
        if (!existing.corequisites.includes(cr)) existing.corequisites.push(cr)
      })
      if (subjectData.details) {
        existing.details = subjectData.details
      }
    } else {
      const id = generateUniqueId(subjectData.code)
      const newSubject: Subject = {
        id,
        ...subjectData,
        branch: branchId ? [branchId] : [],
        branchRelations: branchRelation ? [branchRelation] : []
      }
      subjectList.push(newSubject)
    }
  }

  function parseMandatoryOrOptionalTable(table: Element, defaultNature: Nature) {
    let semester = 0
    const trs = table.querySelectorAll('tbody > tr')

    trs.forEach((row) => {
      if (row.classList.contains('tituloRelatorio')) {
        const text = row.textContent?.trim() || ''
        const match = text.match(/(\d+)[º°]?\s*Semestre/i) || text.match(/(\d+)\s*º/)
        if (match) {
          semester = parseInt(match[1], 10)
        } else if (defaultNature === 'OBRIGATÓRIA') {
          semester++
        }
        if (semester > maxSemester) {
          maxSemester = semester
        }
        return
      }

      if (row.classList.contains('componentes')) {
        const tds = row.querySelectorAll('td')
        if (tds.length < 5) return

        const codeStr = tds[0].textContent?.trim() || ''
        const titleRaw = tds[1].textContent?.trim() || ''
        const { name: nameStr, duration } = parseSubjectNameAndDuration(titleRaw, codeStr)

        const typeRaw = tds[3].textContent?.trim() || 'DISCIPLINA'
        const typeMapped = mapSubjectType(typeRaw)
        
        const natureRaw = tds[4].textContent?.trim() || defaultNature
        const nature: Nature = mapNature(natureRaw, typeMapped)

        const prerequisiteAcronyms = tds[5]?.querySelectorAll('acronym')
        const prerequisites = prerequisiteAcronyms
          ? Array.from(prerequisiteAcronyms).map(a => a.textContent?.trim() || '').filter(Boolean)
          : []

        const equivalenceAcronyms = tds[6]?.querySelectorAll('acronym')
        const equivalences = equivalenceAcronyms
          ? Array.from(equivalenceAcronyms).map(a => a.textContent?.trim() || '').filter(Boolean)
          : []

        const coRequisiteAcronyms = tds[7]?.querySelectorAll('acronym')
        const corequisites = coRequisiteAcronyms
          ? Array.from(coRequisiteAcronyms).map(a => a.textContent?.trim() || '').filter(Boolean)
          : []

        const details = parseSubjectDetails(tds[2], titleRaw)

        addOrUpdateSubject(subjects, {
          code: codeStr,
          name: nameStr,
          semester,
          duration: Number.isNaN(duration) ? 0 : duration,
          nature,
          type: typeMapped,
          prerequisites,
          equivalences,
          corequisites,
          details,
          slug: slugify(nameStr)
        })
      }
    })
  }

  function parseSpecificGroupsTable(table: Element, parentBranchId?: string) {
    const trs = table.querySelectorAll('tbody > tr')
    let currentGroup: Branch | null = null

    trs.forEach((row) => {
      if (row.classList.contains('header')) {
        const groupName = row.textContent?.trim() || ''
        if (!groupName) return

        const groupId = `group-${slugify(groupName)}`
        let existingGroup = branchs.find(b => b.id === groupId)
        if (!existingGroup) {
          const color = BRANCH_COLORS[branchs.length % BRANCH_COLORS.length]
          existingGroup = {
            id: groupId,
            name: groupName,
            color,
            type: 'SPECIFIC_GROUP',
            parentBranchId
          }
          branchs.push(existingGroup)
        }
        currentGroup = existingGroup
        return
      }

      if (row.classList.contains('componentes') && currentGroup) {
        const cellText = row.textContent?.trim() || ''
        const parts = cellText.split(' - ')
        if (parts.length >= 2) {
          const codeStr = parts[0].trim()
          const { name: nameStr, duration } = parseSubjectNameAndDuration(cellText, codeStr)

          addOrUpdateSubject(subjects, {
            code: codeStr,
            name: nameStr,
            semester: 0,
            duration,
            nature: 'OPTATIVA',
            type: 'DISCIPLINA',
            prerequisites: [],
            equivalences: [],
            corequisites: [],
            slug: slugify(nameStr)
          }, currentGroup.id)
        }
        return
      }

      if (currentGroup) {
        const text = row.textContent?.trim() || ''
        if (text.includes('CH Mínima Exigida:')) {
          const match = text.match(/CH Mínima Exigida:\s*(\d+)/i)
          if (match) currentGroup.minHours = parseInt(match[1], 10)
        } else if (text.includes('Qtd. de Componentes Mínima Exigida:')) {
          const match = text.match(/Qtd\.\s*de\s*Componentes\s*Mínima\s*Exigida:\s*(\d+)/i)
          if (match) currentGroup.minComponents = parseInt(match[1], 10)
        }
      }
    })
  }

  function parseEmphasisTable(table: Element) {
    const trs = table.querySelectorAll('tbody > tr')
    let currentEmphasis: Branch | null = null

    trs.forEach((row) => {
      if (row.classList.contains('header')) {
        const cellText = row.textContent?.trim() || ''
        const parts = cellText.split(' - ')
        let branchId = slugify(cellText)
        let branchName = cellText
        let type: BranchType = 'EMPHASIS'

        const lowerText = cellText.toLowerCase()
        if (lowerText.includes('trilha') || lowerText.includes('vertente') || lowerText.includes('slope')) {
          type = 'SLOPE'
        }

        if (parts.length >= 2) {
          branchId = `emphasis-${slugify(parts[0].trim())}`
          branchName = parts.slice(1).join(' - ').trim()
        } else if (cellText) {
          branchId = `emphasis-${slugify(cellText)}`
        }

        if (branchId) {
          let existingEmphasis = branchs.find(b => b.id === branchId)
          if (!existingEmphasis) {
            const color = BRANCH_COLORS[branchs.length % BRANCH_COLORS.length]
            existingEmphasis = {
              id: branchId,
              name: branchName,
              color,
              type
            }
            branchs.push(existingEmphasis)
          }
          currentEmphasis = existingEmphasis
        }
        return
      }

      if (row.classList.contains('componentes') && currentEmphasis) {
        const nestedTable = row.querySelector('table.subFormulario')
        if (nestedTable) {
          parseSpecificGroupsTable(nestedTable, currentEmphasis.id)
          return
        }

        const tds = row.querySelectorAll('td')
        if (tds.length >= 2) {
          const cell1Text = tds[0].textContent?.trim() || ''
          const cell2Text = tds[1]?.textContent?.trim() || 'Optativa (Ênfase)'

          const parts = cell1Text.split(' - ')
          if (parts.length >= 2) {
            const codeStr = parts[0].trim()
            const { name: nameStr, duration } = parseSubjectNameAndDuration(cell1Text, codeStr)
            const isMandatory = cell2Text.toUpperCase().includes('OBRIGATÓRIA')
            const nature: Nature = isMandatory ? 'OBRIGATÓRIA' : 'OPTATIVA'

            addOrUpdateSubject(subjects, {
              code: codeStr,
              name: nameStr,
              semester: 0,
              duration,
              nature: 'OPTATIVA',
              type: 'DISCIPLINA',
              prerequisites: [],
              equivalences: [],
              corequisites: [],
              slug: slugify(nameStr)
            }, currentEmphasis.id, { branchId: currentEmphasis.id, nature })
          }
        }
        return
      }

      if (currentEmphasis) {
        const nestedTable = row.querySelector('table.subFormulario')
        if (nestedTable) {
          parseSpecificGroupsTable(nestedTable, currentEmphasis.id)
        }
      }
    })
  }

  subjectsTables.forEach((table) => {
    const captionText = table.querySelector('caption')?.textContent?.trim() || ''
    if (captionText.includes('Obrigatório') || captionText.includes('Obrigatória')) {
      parseMandatoryOrOptionalTable(table, 'OBRIGATÓRIA')
    } else if (captionText.includes('Optativo') || captionText.includes('Optativa')) {
      parseMandatoryOrOptionalTable(table, 'OPTATIVA')
    } else if (captionText.includes('Grupos de Componentes Específicos')) {
      parseSpecificGroupsTable(table)
    } else if (captionText.includes('Ênfase') || captionText.includes('ênfase')) {
      parseEmphasisTable(table)
    }
  })

  subjects.forEach((subject) => {
    if (subject.semester <= 0 || subject.semester > maxSemester) {
      subject.semester = maxSemester
    }
  });

  return {
    id: code || slug,
    period,
    slug,
    city,
    minTotalHours,
    maxTotalHours,
    mandatoryHours,
    optativeHours,
    extensionHours,
    mandatoryAcademicActivityHours,
    maxOptativeFreeHours,
    minPeriods,
    avgPeriods,
    maxPeriods,
    periodHours,
    branchs,
    subjects,
  }
}
