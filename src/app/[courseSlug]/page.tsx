'use client'

interface CourseProps {
  params: {
    courseSlug: string
  }
}

export default function Course({ params }: CourseProps) {
  console.log({ params })

  return (
    <main>
      <h1 className="font-space text-3xl font-bold">Hello, world!</h1>
    </main>
  )
}
