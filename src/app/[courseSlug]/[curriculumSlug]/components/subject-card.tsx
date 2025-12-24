import { motion } from 'motion/react'
import { type ComponentProps, useCallback, useMemo } from 'react'

import { useCourse } from '@/contexts/course'
import type { Subject } from '@/types/course'
import { capitalizeWords } from '@/utils/capitalize-words'

import { SubjectBar } from './subject-bar'

type SubjectCardProps = ComponentProps<'button'> & {
  subject: Subject
  childIndex?: number
  isActive: boolean
}

export function SubjectCard({
  subject,
  id,
  childIndex = 0,
  isActive = true,
}: SubjectCardProps) {
  const { selectedSubject, setSelectedSubject } = useCourse()
  const name = useMemo(() => capitalizeWords(subject.name), [subject.name])

  const handleClickSubject = useCallback(() => {
    if (selectedSubject?.code === subject.code) {
      setSelectedSubject(null)
    } else {
      setSelectedSubject(subject)
    }
  }, [selectedSubject, setSelectedSubject, subject])

  const selectedStatus = useMemo(
    () => (selectedSubject?.code === subject.code ? 'selected' : 'unselected'),
    [selectedSubject, subject.code],
  )

  const opacity = useMemo(
    () => (isActive || selectedStatus === 'selected' ? 1 : 0.6),
    [isActive, selectedStatus],
  )

  return (
    <motion.button
      id={id}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.2, delay: 0.05 * childIndex }}
      key={subject.code}
      className="group ring-border center before:bg-accent relative flex h-24 w-full max-w-52 shrink-0 cursor-pointer flex-col gap-1 rounded-lg bg-transparent px-4 text-center text-[10px] ring-1 transition-all duration-300 before:absolute before:-z-20 before:size-full before:rounded-lg before:content-[''] after:absolute after:right-0 after:-z-10 after:size-full after:rounded-lg after:bg-black after:opacity-0 after:content-[''] hover:shadow-lg hover:ring-0 active:scale-95 data-[selected=selected]:shadow-lg data-[selected=selected]:ring-0 data-[state=inactive]:opacity-60 dark:ring-slate-700 dark:after:opacity-15"
      onClick={handleClickSubject}
      data-selected={selectedStatus}
      data-state={isActive ? 'active' : 'inactive'}
    >
      <span className="text-accent-foreground text-xs font-medium drop-shadow-sm">
        {name}
      </span>

      <SubjectBar nature={subject.nature} branch={subject.branch} />
    </motion.button>
  )
}
