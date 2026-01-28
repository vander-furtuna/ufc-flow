import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useLayoutEffect, useState } from 'react'

type MobileLayoutMode = 'balanced' | 'calendar-focus' | 'sidebar-focus'

type TourStep = {
  targetId: string
  title: string
  content: string
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  layoutAction?: MobileLayoutMode
}

type TutorialOverlayProps = {
  stepIndex: number
  onNext: () => void
  onPrev: () => void
  onClose: () => void
}

export const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-welcome', // Virtual ID for center screen
    title: 'Bem-vindo a Agenda do UFC Flow!',
    content:
      'Este é um guia rápido para te ajudar a montar sua agenda de horários perfeita. Vamos começar?',
    position: 'center',
  },
  {
    targetId: 'tour-subject-list',
    title: 'Lista de Disciplinas',
    content:
      'Aqui estão todas as cadeiras do seu curso. As disciplinas estão organizadas por semestre e você pode usar a busca para encontrar qualquer uma rapidamente.',
    position: 'right',
    layoutAction: 'sidebar-focus',
  },
  {
    targetId: 'tour-subject-check',
    title: 'Marcar como Concluída',
    content:
      'Já cursou esta disciplina? Clique no marcador para marcá-la como concluída. O sistema liberará automaticamente os pré-requisitos das próximas disciplinas.',
    position: 'right',
    layoutAction: 'sidebar-focus',
  },
  {
    targetId: 'tour-subject-card',
    title: 'Adicionar à Agenda',
    content:
      'Clique no cartão da disciplina para ver as turmas e horários disponíveis. No diálogo que abrir, você poderá escolher a turma que melhor se encaixa na sua semana.',
    position: 'right',
    layoutAction: 'sidebar-focus',
  },
  {
    targetId: 'tour-calendar',
    title: 'Seu Calendário',
    content:
      'Visualize sua semana aqui. As turmas selecionadas aparecerão nestes blocos. Cores diferentes ajudam a organizar.',
    position: 'left',
    layoutAction: 'calendar-focus',
  },
  {
    targetId: 'tour-agenda-controls',
    title: 'Gerencie Agendas',
    content:
      'Crie múltiplas simulações de horário (ex: "Opção A", "Opção B") e alterne entre elas facilmente.',
    position: 'bottom',
  },
  {
    targetId: 'tour-agenda-delete',
    title: 'Excluir Agenda',
    content:
      'Para excluir a agenda atual, clique no botão de lixeira. Cuidado: esta ação não pode ser desfeita!',
    position: 'bottom',
  },
  {
    targetId: 'tour-agenda-download',
    title: 'Baixar Agenda',
    content:
      'Para baixar a agenda atual, clique no botão de download. Você poderá salvar sua simulação como uma imagem PNG para consultar quando quiser.',
    position: 'bottom',
  },
  {
    targetId: 'tour-return',
    title: 'Voltar à Página do Curso',
    content:
      'Para voltar à página do curso, clique no logo do UFC Flow. Isso permitirá que você navegue facilmente entre a simulação e as informações do curso.',
    position: 'bottom',
  },
]

export function TutorialOverlay({
  stepIndex,
  onNext,
  onPrev,
  onClose,
}: TutorialOverlayProps) {
  const step = TOUR_STEPS[stepIndex]
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const isLastStep = stepIndex === TOUR_STEPS.length - 1

  // Update target position
  useLayoutEffect(() => {
    const measure = () => {
      if (step.targetId === 'tour-welcome') {
        // Virtual center rect
        const width = Math.min(window.innerWidth - 40, 500)
        const height = 300
        setTargetRect({
          top: window.innerHeight / 2 - height / 2,
          left: window.innerWidth / 2 - width / 2,
          width: width,
          height: height,
          right: window.innerWidth / 2 + width / 2,
          bottom: window.innerHeight / 2 + height / 2,
          x: window.innerWidth / 2 - width / 2,
          y: window.innerHeight / 2 - height / 2,
          toJSON: () => {},
        })
        return
      }

      const element = document.getElementById(step.targetId)
      if (element) {
        const rect = element.getBoundingClientRect()
        // Add padding
        const padding = 8
        setTargetRect({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          right: rect.right + padding,
          bottom: rect.bottom + padding,
          x: rect.left - padding,
          y: rect.top - padding,
          toJSON: () => {},
        })
      }
    }

    measure()
  }, [step])

  if (!targetRect) return null

  // Calculate tooltip position
  const getTooltipStyle = () => {
    const gap = 12
    const isMobile = window.innerWidth < 1024 // Treat tablets/mobile similarly for overlay layout
    const style: React.CSSProperties = { position: 'fixed', zIndex: 100 }

    if (step.targetId === 'tour-welcome' || step.position === 'center') {
      style.top = '50%'
      style.left = '50%'
      style.transform = 'translate(-50%, -50%)'
      // Center step usually doesn't need specific clamping if we use max-width in CSS
      return style
    }

    let pos = step.position

    // Adapt position for mobile: Prefer Top/Bottom over Left/Right due to narrow width
    if (isMobile && (pos === 'left' || pos === 'right')) {
      const spaceBelow = window.innerHeight - targetRect.bottom
      // If plenty of space below, go bottom. Else go top.
      pos = spaceBelow > 250 ? 'bottom' : 'top'
    }

    // Estimate card width for centering calculations (matches CSS max-w)
    const cardWidth = Math.min(350, window.innerWidth - 32)

    switch (pos) {
      case 'bottom':
        style.top = targetRect.bottom + gap
        style.left = targetRect.left + targetRect.width / 2 - cardWidth / 2
        break
      case 'top':
        style.bottom = window.innerHeight - targetRect.top + gap
        style.left = targetRect.left + targetRect.width / 2 - cardWidth / 2
        break
      case 'right':
        style.top = targetRect.top
        style.left = targetRect.right + gap
        break
      case 'left':
        style.top = targetRect.top
        style.right = window.innerWidth - targetRect.left + gap
        break
    }

    // Viewport Boundary checks (Clamp Horizontal)
    if (style.left !== undefined && typeof style.left === 'number') {
      style.left = Math.max(
        16,
        Math.min(window.innerWidth - cardWidth - 16, style.left),
      )
    }

    // Ensure vertical safety for bottom/top
    if (pos === 'bottom' && (style.top as number) + 200 > window.innerHeight) {
      // If it overflows bottom, flip to top if possible (rudimentary check)
      if (targetRect.top > 200) {
        delete style.top
        style.bottom = window.innerHeight - targetRect.top + gap
      }
    }

    return style
  }

  return (
    <div className="fixed inset-0 z-60 overflow-hidden">
      {/* SVG Mask for Spotlight Effect */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full transition-all duration-300 ease-in-out">
        <defs>
          <mask id="tour-mask" x="0" y="0" width="100%" height="100%">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left}
              y={targetRect.top}
              width={targetRect.width}
              height={targetRect.height}
              rx="8"
              fill="black"
              className="transition-all duration-300 ease-in-out"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.75)"
          mask="url(#tour-mask)"
        />

        {/* Highlight Border */}
        <rect
          x={targetRect.left}
          y={targetRect.top}
          width={targetRect.width}
          height={targetRect.height}
          rx="8"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeDasharray="4 4"
          className="opacity-50 transition-all duration-300 ease-in-out"
        />
      </svg>

      {/* Tooltip Card */}
      <div
        className="animate-in fade-in slide-in-from-bottom-4 bg-background dark:bg-background/60 flex w-[calc(100vw-32px)] max-w-87.5 flex-col space-y-4 overflow-hidden rounded-lg border shadow-2xl backdrop-blur-lg duration-300 md:w-87.5"
        style={getTooltipStyle()}
      >
        <div className="bg-accent/90 flex items-center justify-between px-4 py-3">
          <h3 className="font-clash text-foreground text-lg leading-tight font-semibold">
            {step.title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={16} />
          </button>
        </div>

        <p className="px-4 py-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {step.content}
        </p>

        <div className="bg-accent/90 mt-auto flex items-center justify-between px-4 py-3">
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === stepIndex ? 'bg-primary w-6' : 'bg-foreground/20 w-1.5'}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {stepIndex > 0 && (
              <button
                onClick={onPrev}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <button
              onClick={isLastStep ? onClose : onNext}
              className="bg-primary text-primary-foreground flex items-center gap-1 rounded-md px-4 py-1.5 text-sm font-bold shadow-sm transition-colors"
            >
              {isLastStep ? 'Concluir' : 'Próximo'}
              {!isLastStep && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
