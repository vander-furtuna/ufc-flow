'use client'

import { useEffect, useState } from 'react'

import { useCourse } from '@/contexts/course'
import { COLORS } from '@/data/colors'
import { useHorizontalScroll } from '@/hooks/use-horizontal-scroll'
import { getGradientColor } from '@/utils/get-gradient-color'

export function SubjectTypeSubtitle() {
  const { selectedCurriculum } = useCourse()

  const scrollRef = useHorizontalScroll()

  // Estados para controlar a visibilidade das sombras de gradiente
  const [showLeftShadow, setShowLeftShadow] = useState(false)
  const [showRightShadow, setShowRightShadow] = useState(false)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    // Função para verificar a posição do scroll e atualizar a visibilidade das sombras
    const checkScroll = () => {
      // Verifica se o conteúdo realmente ultrapassa a área visível
      const hasHorizontalOverflow = element.scrollWidth > element.clientWidth

      if (hasHorizontalOverflow) {
        // Mostra a sombra esquerda se o scroll não estiver no início
        setShowLeftShadow(element.scrollLeft > 0)

        // Mostra a sombra direita se o scroll não estiver no final.
        // Usamos uma pequena tolerância (1px) para evitar problemas de arredondamento.
        const isAtEnd =
          element.scrollLeft + element.clientWidth >= element.scrollWidth - 1
        setShowRightShadow(!isAtEnd)
      } else {
        // Se não houver overflow, esconde ambas as sombras
        setShowLeftShadow(false)
        setShowRightShadow(false)
      }
    }

    // Verifica o estado inicial assim que o componente é montado e sempre que os 'times' mudam
    checkScroll()

    // Adiciona um ouvinte para o evento de scroll no elemento
    element.addEventListener('scroll', checkScroll)

    // Usa um ResizeObserver para re-verificar caso o tamanho do container mude (ex: rotação da tela)
    const resizeObserver = new ResizeObserver(checkScroll)
    resizeObserver.observe(element)

    // Função de limpeza para remover os ouvintes quando o componente for desmontado
    return () => {
      element.removeEventListener('scroll', checkScroll)
      resizeObserver.unobserve(element)
    }
  }, [selectedCurriculum, scrollRef])

  return (
    <div className="relative w-full">
      <div
        className="no-scrollbar relative flex w-full gap-2 overflow-x-auto"
        ref={scrollRef}
      >
        <div className="bg-accent border-border flex shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 py-1.5">
          <div
            className="size-3 rounded-full"
            style={{
              background: getGradientColor(COLORS.COMPULSORY),
            }}
          />
          <span className="text-xs font-medium">Obrigatória</span>
        </div>
        <div className="bg-accent border-border flex shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 py-1.5">
          <div
            className="size-3 rounded-full"
            style={{
              background: getGradientColor(COLORS.OPTIONAL),
            }}
          />
          <span className="text-xs font-medium">Optativa Livre</span>
        </div>
        {selectedCurriculum?.branchs.map((branch) => (
          <div
            key={branch.id}
            className="bg-accent border-border flex shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 py-1.5"
          >
            <div
              className="size-3 rounded-full"
              style={{
                background: getGradientColor(branch.color),
              }}
            />
            <span className="text-xs font-medium">{branch.name}</span>
          </div>
        ))}
      </div>
      {/* Sombra da Esquerda */}
      <div
        aria-hidden="true"
        data-state={showLeftShadow ? 'visible' : 'hidden'}
        className="from-background pointer-events-none absolute top-0 left-0 h-full w-16 bg-gradient-to-r to-transparent transition-all duration-200 data-[state=hidden]:opacity-0 data-[state=visible]:opacity-100"
      />

      {/* Sombra da Direita */}
      <div
        aria-hidden="true"
        data-state={showRightShadow ? 'visible' : 'hidden'}
        className="from-background pointer-events-none absolute top-0 right-0 z-50 h-full w-16 bg-gradient-to-l to-transparent transition-all duration-200 data-[state=hidden]:opacity-0 data-[state=visible]:opacity-100"
      />
    </div>
  )
}
