import { Badge, Calendar, Clock, Copy, Split, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'

import { useCourse } from '@/app/contexts/course'
import { useFilter } from '@/app/contexts/filter'
import { Glow } from '@/components/glow'
import { COLORS } from '@/data/colors'
import { capitalizeWords } from '@/utils/capitalize-words'

import { SubjectCardSmall } from '../subject-card-small'
import { Pill } from './pill'
import { SectionTitle } from './section-title'

// interface SidebarProps {}

export function Sidebar() {
  const {
    branchFilter,
    natureFilter,
    semesterFilter,
    durationFilter,
    setBranchFilter,
    setNatureFilter,
    setSemesterFilter,
    setDurationFilter,
  } = useFilter()
  const { selectedSubject, selectedCurriculum, setSelectedSubject } =
    useCourse()

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

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast.success(
          'Código da disciplina copiado para a área de transferência',
        )
      },
      (err) => {
        console.error('Failed to copy the text to clipboard', err)
        toast.error('Falha ao copiar o código da disciplina')
      },
    )
  }, [])

  return (
    <AnimatePresence>
      {selectedSubject && (
        <motion.aside
          className="fixed right-4 h-full w-72 shrink-0 overflow-hidden md:relative"
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
            drag="x"
            dragElastic={0}
            onDragEnd={(_e, info) => {
              if (info.offset.x > 2 || info.offset.x < -2) {
                handleUnselectSubject()
              }
            }}
            className="fixed h-dvh w-72 shrink-0 py-8"
          >
            <div className="relative h-full w-full overflow-hidden overflow-y-auto overflow-x-hidden rounded-md bg-slate-100/50 pb-16 backdrop-blur-md no-scrollbar md:bg-slate-100 dark:bg-slate-900/60 dark:md:bg-slate-900">
              <Glow
                colors={glowColor}
                className="absolute -top-72 left-1/2 z-10 size-128 -translate-x-1/2 blur-[100px]"
              />
              <div className="relative z-20 h-44 w-full px-8 center">
                <button
                  className="absolute right-3 top-3 size-6 rounded-md transition-colors center hover:bg-foreground/20"
                  onClick={handleUnselectSubject}
                >
                  <X className="size-5 opacity-70" />
                </button>
                <strong className="w-full text-center font-clash text-lg font-semibold drop-shadow-lg center dark:text-slate-50">
                  {selectedSubject.name}
                </strong>
                <button
                  className="absolute bottom-2 flex w-fit gap-2 rounded-full bg-slate-50/40 px-2 py-1 font-semibold text-slate-800 transition-all duration-300 center dark:bg-slate-900/10 dark:text-slate-100 dark:hover:bg-slate-900/20"
                  onClick={() => copyToClipboard(selectedSubject.code)}
                >
                  <span className="font-clash text-sm">
                    {selectedSubject.code}
                  </span>
                  <figure className="size-4">
                    <Copy strokeWidth={2.5} className="size-3" />
                  </figure>
                </button>
              </div>
              <div className="relative z-20 flex flex-col gap-2">
                <div className="gap-1 center">
                  <Pill
                    Icon={<Badge strokeWidth={2} className="size-4" />}
                    label={capitalizeWords(selectedSubject.nature)}
                    colors={glowColor}
                    isActive={natureFilter.includes(selectedSubject.nature)}
                    onClick={() => setNatureFilter([selectedSubject.nature])}
                  />
                  <Pill
                    Icon={<Calendar strokeWidth={2} className="size-4" />}
                    label={`${selectedSubject.semester}º`}
                    colors={glowColor}
                    isActive={semesterFilter.includes(selectedSubject.semester)}
                    onClick={() =>
                      setSemesterFilter([selectedSubject.semester])
                    }
                  />
                  <Pill
                    Icon={<Clock strokeWidth={2} className="size-4" />}
                    label={`${selectedSubject.duration}h`}
                    colors={glowColor}
                    isActive={durationFilter.includes(selectedSubject.duration)}
                    onClick={() =>
                      setDurationFilter([selectedSubject.duration])
                    }
                  />
                </div>
                <div className="flex-wrap gap-1 center">
                  {getBranchs.map((branch) => (
                    <Pill
                      key={branch.id}
                      Icon={<Split strokeWidth={2} className="size-4" />}
                      label={branch.name}
                      colors={glowColor}
                      isActive={branchFilter.includes(branch.id)}
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
            <div className="fixed bottom-8 z-50 h-16 w-72 rounded-md bg-linear-to-t from-slate-100 to-transparent dark:from-slate-900" />
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
