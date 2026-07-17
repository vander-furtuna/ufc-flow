import {
  Calendar,
  Clock,
  Copy,
  Download,
  Loader2,
  Pin,
  Tag,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'

import { Glow } from '@/components/glow'
import { useCourse } from '@/contexts/course'
import { useFilter } from '@/contexts/filter'
import { COLORS } from '@/data/colors'
import { useDownloadAsPNG } from '@/hooks/use-download-as-png'
import { capitalizeWords } from '@/utils/capitalize-words'

import { SubjectCardSmall } from '../subject-card-small'
import { Details } from './details'
import { Pill } from './pill'
import { SectionTitle } from './section-title'

export function Sidebar() {
  const { elementRef, downloadPNG, isLoading } = useDownloadAsPNG()

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
      () => {
        toast.error('Não foi possível copiar o código da disciplina')
      },
    )
  }, [])

  return (
    <AnimatePresence>
      {selectedSubject && (
        <motion.aside
          className="fixed right-4 z-20 h-full shrink-0 overflow-hidden md:relative"
          initial={{ width: 0 }}
          animate={{ width: 'auto' }}
          exit={{ width: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
            className="fixed h-dvh w-full shrink-0 py-8 sm:w-80"
          >
            <div
              className="no-scrollbar group/container relative h-full w-full overflow-hidden overflow-x-hidden overflow-y-auto rounded-md border bg-slate-100/70 pb-16 backdrop-blur-md dark:bg-slate-900/90 dark:md:bg-slate-900"
              ref={elementRef}
            >
              <Glow
                colors={glowColor}
                className="absolute -top-80 left-1/2 z-10 size-128 -translate-x-1/2 blur-[100px]"
              />
              <div className="center relative z-20 h-44 w-full px-8">
                <button
                  className="center hover:bg-foreground/20 absolute top-3 right-3 size-6 rounded-md transition-colors"
                  onClick={handleUnselectSubject}
                >
                  <X className="size-5 opacity-70" />
                </button>
                <strong className="font-heading center w-full text-center text-lg font-semibold drop-shadow-lg dark:text-slate-50">
                  {selectedSubject.name}
                </strong>
                <div className="absolute bottom-2 flex w-fit gap-1">
                  <button
                    className="center flex w-fit gap-2 rounded-full bg-slate-50/40 px-2 py-1 font-semibold text-slate-800 transition-all duration-300 dark:bg-slate-900/10 dark:text-slate-100 dark:hover:bg-slate-900/20"
                    onClick={() => copyToClipboard(selectedSubject.code)}
                  >
                    <span className="font-heading text-sm">
                      {selectedSubject.code}
                    </span>
                    <figure className="size-4">
                      <Copy strokeWidth={2.5} className="size-3" />
                    </figure>
                  </button>
                  <button
                    className="center flex w-fit gap-2 rounded-full bg-slate-50/40 px-2 py-1 font-semibold text-slate-800 transition-all duration-300 group-data-[download=active]/container:hidden dark:bg-slate-900/10 dark:text-slate-100 dark:hover:bg-slate-900/20 data-[download=active]:dark:bg-slate-900/20"
                    disabled={isLoading}
                    onClick={() =>
                      downloadPNG(
                        `${selectedSubject.code} - ${selectedSubject.name}`,
                      )
                    }
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download strokeWidth={2.5} className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="relative z-20 flex flex-col gap-2">
                <div className="center gap-1">
                  <Pill
                    Icon={<Pin strokeWidth={2} className="size-4" />}
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
                <div className="center flex-wrap gap-1">
                  {getBranchs.map((branch) => (
                    <Pill
                      key={branch.id}
                      Icon={<Tag strokeWidth={2} className="size-4" />}
                      label={branch.name}
                      colors={glowColor}
                      isActive={branchFilter.includes(branch.id)}
                      onClick={() => setBranchFilter([branch.id])}
                    />
                  ))}
                </div>
              </div>
              <Details code={selectedSubject.code} />
              {preRequisites.length > 0 && (
                <div className="relative z-20 mt-8 flex flex-col gap-4 px-2">
                  <SectionTitle>Pré-requisitos</SectionTitle>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {preRequisites.map((preRequisite, index) => (
                      <SubjectCardSmall
                        childIndex={index}
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
                    {unlockables.map((unlockable, index) => (
                      <SubjectCardSmall
                        childIndex={index}
                        subject={unlockable}
                        key={unlockable.id}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="fixed bottom-8 z-50 h-16 w-80 rounded-md bg-linear-to-t from-slate-100 to-transparent dark:from-slate-900" />
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
