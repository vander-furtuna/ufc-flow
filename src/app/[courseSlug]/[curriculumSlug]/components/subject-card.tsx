import { motion } from 'framer-motion'
import { useMemo } from 'react'

import { useCourse } from '@/app/contexts/course'
import type { Subject } from '@/types/course'
import { capitalizeWords } from '@/utils/capitalize-words'

import { SubjectBar } from './subject-bar'

interface SubjectCardProps {
  subject: Subject
}

export function SubjectCard({ subject }: SubjectCardProps) {
  const { selectedSubject, setSelectedSubject } = useCourse()
  const name = useMemo(() => capitalizeWords(subject.name), [subject.name])

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      key={subject.code}
      className="group relative flex h-24 w-38 flex-shrink-0 cursor-pointer flex-col gap-1 rounded-lg bg-transparent px-4 text-center text-[10px] ring-1 ring-border transition-all duration-300 center before:absolute before:-z-20 before:size-full before:rounded-lg before:bg-accent before:content-[''] hover:shadow-lg hover:ring-0 data-[selected=selected]:shadow-lg data-[selected=selected]:ring-0 dark:ring-slate-700"
      onClick={() =>
        selectedSubject?.code === subject.code
          ? setSelectedSubject(null)
          : setSelectedSubject(subject)
      }
      data-selected={
        selectedSubject?.code === subject.code ? 'selected' : 'unselected'
      }
    >
      <span className="text-xs font-medium text-accent-foreground drop-shadow">
        {name}
      </span>

      <SubjectBar nature={subject.nature} branch={subject.branch} />
    </motion.button>
  )
}
