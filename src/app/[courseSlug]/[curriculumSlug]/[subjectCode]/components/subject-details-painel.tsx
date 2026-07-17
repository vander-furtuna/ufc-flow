import { Glow } from '@/components/glow'
import { ArrowLeft, Calendar, ChevronUp, Clock, Copy, Pin } from 'lucide-react'
import { Pill } from '../../components/sidebar/pill'
import { capitalizeWords } from '@/utils/capitalize-words'
import { cn } from '@/lib/utils'
import { useCallback, useState } from 'react'
import type { Branch, Subject } from '@/types/course'
import { getGlowColor } from '@/utils/get-glow-color'
import { toast } from 'sonner'

type SubjectDetailsPainelProps = {
  subject: Subject
  branches: Branch[]
  isPersistent?: boolean
  onBack: () => void
}

export function SubjectDetailsPainel({
  subject,
  branches,
  isPersistent = false,
  onBack,
}: SubjectDetailsPainelProps) {
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(true)

  const colors =
    branches
      .filter((currentBranch) => subject?.branch.includes(currentBranch.id)) // Filtra apenas as branchs com ids presentes em branchsIds
      .map((branch) => branch.color) ?? []

  const glowColor = getGlowColor(subject?.nature, colors)

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
    <div
      className="absolute top-4 left-1/2 z-20 flex w-80 -translate-x-1/2 flex-col items-center overflow-hidden rounded-lg border border-gray-200 bg-white/90 p-4 shadow-lg backdrop-blur-sm transition-colors duration-300 data-[state=closed]:flex-row data-[state=closed]:gap-2 md:left-4 md:translate-0 dark:border-slate-800 dark:bg-slate-900/90"
      data-state={isInfoPanelOpen ? 'open' : 'closed'}
    >
      <Glow
        colors={glowColor}
        className="absolute -top-80 left-1/2 -z-10 size-128 -translate-x-1/2 blur-[100px]"
      />
      <button
        onClick={onBack}
        className="z-20 mr-auto flex cursor-pointer items-center text-sm"
      >
        <ArrowLeft size={16} className="mr-1" />
        {isInfoPanelOpen && <span>Voltar para Semestres</span>}
      </button>
      <h2
        className={cn(
          'font-heading center mt-3 w-full text-center text-lg font-semibold drop-shadow-lg dark:text-slate-50',
          isInfoPanelOpen ? '' : 'mt-0 text-base',
        )}
      >
        {subject.name}
      </h2>

      {subject?.code && isInfoPanelOpen && (
        <button
          className="center mt-2 flex w-fit gap-2 rounded-full bg-slate-50/40 px-2 py-1 font-semibold text-slate-800 transition-all duration-300 dark:bg-slate-900/10 dark:text-slate-100 dark:hover:bg-slate-900/20"
          onClick={() => copyToClipboard(subject.code)}
        >
          <span className="font-heading text-sm">{subject.code}</span>
          <figure className="size-4">
            <Copy strokeWidth={2.5} className="size-3" />
          </figure>
        </button>
      )}

      {isInfoPanelOpen && (
        <div className="center mt-1 flex-wrap gap-1">
          <Pill
            Icon={<Pin strokeWidth={2} className="size-4" />}
            label={capitalizeWords(subject.nature)}
            colors={glowColor}
          />
          <Pill
            Icon={<Calendar strokeWidth={2} className="size-4" />}
            label={`${subject.semester}º`}
            colors={glowColor}
          />
          <Pill
            Icon={<Clock strokeWidth={2} className="size-4" />}
            label={`${subject.duration}h`}
            colors={glowColor}
          />
        </div>
      )}

      {isInfoPanelOpen && (
        <div className="text-foreground/80 mt-3 text-[10px] italic sm:text-xs">
          {isPersistent
            ? 'Visualização travada. Clique na disciplina ativa para destravar.'
            : 'Passe o mouse ou clique em qualquer nó para analisar as dependências.'}
        </div>
      )}

      <button
        className={cn('bg-accent/30 mt-2 rounded-full px-2 py-0.5')}
        onClick={() => setIsInfoPanelOpen((prev) => !prev)}
      >
        <ChevronUp
          className={cn(
            'text-foreground/85 size-6 transition-transform duration-300',
            isInfoPanelOpen ? '' : 'rotate-180',
          )}
        />
      </button>
    </div>
  )
}
