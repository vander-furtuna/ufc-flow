type Nature = 'OBRIGATÓRIA' | 'OPTATIVA'

export type Branch = {
  id: string
  name: string
  color: string
}

export type Subjects = {
  id: string
  code: string
  name: string
  semester: number
  duration: number
  nature: Nature
  type: string
  branch: string[]
  prerequisites: string[]
}

export type CurriculumStructure = {
  id: string
  period: string
  slug: string
  branchs: Branch[]
  subjects: Subjects[]
}

export type Course = {
  id: string
  slug: string
  name: string
  curriculumStructures: CurriculumStructure[]
}
