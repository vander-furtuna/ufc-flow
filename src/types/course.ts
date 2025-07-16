type Nature = 'OBRIGATÓRIA' | 'OPTATIVA'

export type Branch = {
  id: string
  name: string
  color: string
}

export type Subject = {
  id: string
  code: string
  name: string
  semester: number
  duration: number
  nature: Nature
  type: string
  branch: string[]
  prerequisites: string[]
  slug: string
}

export type CurriculumStructure = {
  id: string
  period: string
  slug: string
  city: string
  minTotalHours: number
  branchs: Branch[]
  subjects: Subject[]
}

export type Course = {
  id: string
  slug: string
  name: string

  curriculumStructures: CurriculumStructure[]
}
