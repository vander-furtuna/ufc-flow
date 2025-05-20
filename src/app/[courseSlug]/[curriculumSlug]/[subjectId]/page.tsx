import { use } from 'react'

type SubjectProps = {
  params: Promise<{
    subjectId: string
  }>
}

export default function Subject({ params }: SubjectProps) {
  const { subjectId } = use(params)

  return (
    <main className="center flex h-dvh w-full">
      <article className="h-full max-w-5xl">
        <h1>{subjectId}</h1>
      </article>
    </main>
  )
}
