import {
  Calendar,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Loader2,
  Pin,
  Tag,
  Workflow,
  X,
} from 'lucide-react'
import { useCallback } from 'react'
import { toast } from 'sonner'

import { Glow } from '@/components/glow'
import { useCourse } from '@/contexts/course'
import { useFilter } from '@/contexts/filter'
import { getGlowColor } from '@/utils/get-glow-color'
import { useDownloadAsPNG } from '@/hooks/use-download-as-png'
import { capitalizeWords } from '@/utils/capitalize-words'

import { SubjectCardSmall } from '../subject-card-small'
import { Details } from './details'
import { Pill } from './pill'
import { SectionTitle } from './section-title'
import { usePathname, useRouter } from 'next/navigation'

export function Sidebar() {
  const pathname = usePathname()

  const router = useRouter()

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

  const colors =
    selectedCurriculum?.branchs
      .filter((currentBranch) =>
        selectedSubject?.branch.includes(currentBranch.id),
      ) // Filtra apenas as branchs com ids presentes em branchsIds
      .map((branch) => branch.color) ?? []

  const glowColor = getGlowColor(selectedSubject?.nature, colors)

  const getBranchs =
    selectedCurriculum && selectedSubject
      ? selectedCurriculum.branchs.filter((branch) =>
          selectedSubject.branch.includes(branch.id),
        )
      : []

  const preRequisites =
    selectedCurriculum && selectedSubject
      ? selectedCurriculum.subjects.filter((subject) =>
          selectedSubject.prerequisites.includes(subject.code),
        )
      : []

  const unlockables =
    selectedCurriculum && selectedSubject
      ? selectedCurriculum.subjects.filter((subject) =>
          subject.prerequisites.includes(selectedSubject.code),
        )
      : []

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

  const handleGoToSubject = useCallback(() => {
    if (selectedSubject) {
      router.push(`${pathname}/${selectedSubject.code}`)
    }
  }, [selectedSubject, pathname, router])

  return (
    <aside
      className="group/sidebar fixed right-0 z-100 h-full w-0 shrink-0 overflow-hidden opacity-0 transition-all duration-300 ease-in-out data-[state=open]:w-full data-[state=open]:opacity-100 md:relative md:z-10 data-[state=open]:md:w-80"
      data-state={selectedSubject ? 'open' : 'closed'}
    >
      <div className="fixed h-dvh w-full shrink-0 transition-all duration-300 ease-in-out group-data-[state=closed]/sidebar:w-0 md:w-80 md:py-8">
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
              className="center hover:bg-foreground/20 absolute top-3 right-3 size-8 rounded-md transition-colors"
              onClick={handleUnselectSubject}
            >
              <X className="size-5 opacity-70" />
            </button>
            {selectedSubject?.name && (
              <strong className="font-clash center w-full text-center text-lg font-semibold drop-shadow-lg dark:text-slate-50">
                {selectedSubject.name}
              </strong>
            )}
            <div className="absolute bottom-2 flex w-fit gap-1">
              {selectedSubject?.code && (
                <button
                  className="center flex w-fit gap-2 rounded-full bg-slate-50/40 px-2 py-1 font-semibold text-slate-800 transition-all duration-300 dark:bg-slate-900/10 dark:text-slate-100 dark:hover:bg-slate-900/20"
                  onClick={() => copyToClipboard(selectedSubject.code)}
                >
                  <span className="font-clash text-sm">
                    {selectedSubject.code}
                  </span>
                  <figure className="size-4">
                    <Copy strokeWidth={2.5} className="size-3" />
                  </figure>
                </button>
              )}
              {selectedSubject && (
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
              )}
            </div>
          </div>
          <div className="relative z-20 flex flex-col gap-2">
            {selectedSubject && (
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
                  onClick={() => setSemesterFilter([selectedSubject.semester])}
                />
                <Pill
                  Icon={<Clock strokeWidth={2} className="size-4" />}
                  label={`${selectedSubject.duration}h`}
                  colors={glowColor}
                  isActive={durationFilter.includes(selectedSubject.duration)}
                  onClick={() => setDurationFilter([selectedSubject.duration])}
                />
              </div>
            )}

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
          {selectedSubject && (
            <div className="mt-6 w-full px-4">
              <button
                className="bg-muted border-border flex w-full items-center justify-between rounded-md border px-2 py-1 decoration-0"
                onClick={handleGoToSubject}
              >
                <div className="flex items-center gap-2">
                  <Workflow className="text-foreground/80" />
                  <span className="text-sm">Visualização em árvore</span>
                </div>

                <ChevronRight className="text-foreground/70 size-4" />
              </button>
            </div>
          )}
          {selectedSubject && <Details code={selectedSubject.code} />}
          {preRequisites.length > 0 && (
            <div className="relative z-20 mt-8 flex flex-col gap-4 px-4">
              <SectionTitle>Pré-requisitos</SectionTitle>
              <div className="grid w-full grid-flow-dense auto-rows-[88px] grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] justify-items-center gap-2">
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
            <div className="relative z-20 mt-8 flex flex-col gap-4 px-4">
              <SectionTitle>Desbloqueia</SectionTitle>
              <div className="grid w-full grid-flow-dense auto-rows-[88px] grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] justify-items-center gap-2">
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
        <div className="fixed bottom-0 z-100 h-16 w-full rounded-md bg-linear-to-t from-slate-100 to-transparent transition-all duration-300 ease-in-out group-data-[state=closed]/sidebar:w-0 md:bottom-8 md:z-50 md:w-80 dark:from-slate-900" />
      </div>
    </aside>
  )
}
