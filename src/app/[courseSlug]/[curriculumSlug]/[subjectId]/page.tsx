import { use } from 'react'

type SubjectProps = {
  params: Promise<{
    subjectId: string
  }>
}

export function Subject({ params }: SubjectProps) {
  const { subjectId } = use(params)

  return <div>Subject {subjectId}</div>
}
