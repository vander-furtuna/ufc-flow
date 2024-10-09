import { AnimatePresence, motion } from 'framer-motion'
import { Badge, Calendar, Clock, Split, X } from 'lucide-react'
import { useCallback, useMemo } from 'react'

import { useCourse } from '@/app/contexts/course'
import { Glow } from '@/components/glow'
import { COLORS } from '@/data/colors'
import { capitalizeWords } from '@/utils/capitalize-words'

import { SubjectCardSmall } from '../subject-card-small'
import { Pill } from './pill'
import { SectionTitle } from './section-titlte'

// interface SidebarProps {}

export function Sidebar() {
  const {
    selectedSubject,
    selectedCurriculum,
    setSelectedSubject,
    setBranchFilter,
  } = useCourse()

  const colors = useMemo(
    () =>
      selectedCurriculum?.branchs
        .filter((currentBranch) =>
          selectedSubject?.branch.includes(currentBranch.id),
        ) // Filtra apenas as branchs com ids presentes em branchsIds
        .map((branch) => branch.color),
    [selectedCurriculum?.branchs, selectedSubject?.branch],
  )

  const glowColor = useMemo(() => {
    if (selectedSubject?.nature === 'OBRIGATÓRIA') {
      return COLORS.COMPULSORY
    } else if (selectedSubject?.nature === 'OPTATIVA') {
      if (colors && colors?.length > 0) {
        return colors
      } else {
        return COLORS.OPTIONAL
      }
    }
    return ''
  }, [colors, selectedSubject?.nature])

  const getBranchs = useMemo(() => {
    if (selectedCurriculum) {
      return selectedCurriculum.branchs.filter((branch) =>
        selectedSubject?.branch.includes(branch.id),
      )
    }
    return []
  }, [selectedCurriculum, selectedSubject?.branch])

  const preRequisites = useMemo(() => {
    if (selectedCurriculum) {
      return selectedCurriculum.subjects.filter((subject) =>
        selectedSubject?.prerequisites.includes(subject.code),
      )
    }
    return []
  }, [selectedCurriculum, selectedSubject?.prerequisites])

  const unlockables = useMemo(() => {
    if (selectedCurriculum && selectedSubject) {
      return selectedCurriculum.subjects.filter((subject) =>
        subject.prerequisites.includes(selectedSubject.code),
      )
    }
    return []
  }, [selectedCurriculum, selectedSubject])

  const handleUnselectSubject = useCallback(() => {
    setSelectedSubject(null)
  }, [setSelectedSubject])

  return (
    <AnimatePresence>
      {selectedSubject && (
        <motion.aside
          className="fixed right-4 h-full w-72 flex-shrink-0 overflow-hidden md:relative"
          initial={{ width: '0rem' }}
          animate={{ width: '18rem' }}
          exit={{ width: '0rem' }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
            className="fixed h-dvh w-72 flex-shrink-0 py-8"
          >
            <div className="relative h-full w-full overflow-hidden overflow-y-auto overflow-x-hidden rounded-md bg-slate-100/50 pb-16 backdrop-blur-md no-scrollbar md:bg-slate-100 dark:bg-slate-900/60 dark:md:bg-slate-900">
              <Glow
                colors={glowColor}
                className="absolute -top-72 left-1/2 z-10 size-[32rem] -translate-x-1/2 blur-[100px]"
              />
              <div className="relative z-20 h-36 w-full px-8 center">
                <button
                  className="absolute right-3 top-3 size-6 rounded-md transition-colors center hover:bg-foreground/20"
                  onClick={handleUnselectSubject}
                >
                  <X className="size-5 opacity-70" />
                </button>
                <strong className="w-full text-center font-space text-lg center dark:text-slate-50">
                  {selectedSubject.name}
                </strong>
              </div>
              <div className="relative z-20 flex flex-col gap-2">
                <div className="gap-1 center">
                  <Pill
                    Icon={<Badge strokeWidth={2} className="size-4" />}
                    label={capitalizeWords(selectedSubject.nature)}
                    // onClick={() => setNatureFilter([selectedSubject.nature])}
                  />
                  <Pill
                    Icon={<Calendar strokeWidth={2} className="size-4" />}
                    label={`${selectedSubject.semester}º`}
                    // onClick={() =>
                    //   setSemesterFilter([selectedSubject.semester])
                    // }
                  />
                  <Pill
                    Icon={<Clock strokeWidth={2} className="size-4" />}
                    label={`${selectedSubject.duration}h`}
                    // onClick={() =>
                    //   setDurationFilter([selectedSubject.duration])
                    // }
                  />
                </div>
                <div className="flex-wrap gap-1 center">
                  {getBranchs.map((branch) => (
                    <Pill
                      key={branch.id}
                      Icon={<Split strokeWidth={2} className="size-4" />}
                      label={branch.name}
                      onClick={() => setBranchFilter([branch.id])}
                    />
                  ))}
                </div>
              </div>
              {preRequisites.length > 0 && (
                <div className="relative z-20 mt-8 flex flex-col gap-4 px-2">
                  <SectionTitle>Pre-requisítos</SectionTitle>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {preRequisites.map((preRequisite) => (
                      <SubjectCardSmall
                        subject={preRequisite}
                        key={preRequisite.id}
                      />
                    ))}
                  </div>
                </div>
              )}
              {unlockables.length > 0 && (
                <div className="relative z-20 mt-8 flex flex-col gap-4 px-2">
                  <SectionTitle>Desbloqueia</SectionTitle>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {unlockables.map((unlockable) => (
                      <SubjectCardSmall
                        subject={unlockable}
                        key={unlockable.id}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="fixed bottom-8 z-50 h-16 w-full rounded-md bg-gradient-to-t from-slate-100 to-transparent dark:from-slate-900" />
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
