'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  useHorizontalScroll,
  type HorizontalScrollOptions,
} from './use-horizontal-scroll'

export interface HorizontalScrollWithOverlayOptions extends HorizontalScrollOptions {
  /**
   * Distância mínima em pixels para ativar a visibilidade das sombras.
   * Evita oscilações causadas por arredondamento de subpixels ou DPI scaling.
   * @default 8
   */
  threshold?: number
}

export function useHorizontalScrollWithOverlay<T extends HTMLElement>(
  options: HorizontalScrollWithOverlayOptions = {},
) {
  const { threshold = 8, ...scrollOptions } = options
  const scrollRefCallback = useHorizontalScroll<T>(scrollOptions)
  const [element, setElement] = useState<T | null>(null)

  // Estados para controlar a visibilidade das sombras de gradiente
  const [showLeftShadow, setShowLeftShadow] = useState(false)
  const [showRightShadow, setShowRightShadow] = useState(false)

  const scrollRef = useCallback(
    (node: T | null) => {
      scrollRefCallback(node)
      setElement(node)
    },
    [scrollRefCallback],
  )

  useEffect(() => {
    if (!element) return

    // Função para verificar a posição do scroll e atualizar a visibilidade das sombras
    const checkScroll = () => {
      // Verifica se o conteúdo realmente ultrapassa a área visível
      const hasHorizontalOverflow = element.scrollWidth > element.clientWidth

      if (hasHorizontalOverflow) {
        // Mostra a sombra esquerda se o scroll passou do início respeitando o threshold
        setShowLeftShadow(element.scrollLeft > threshold)

        // Mostra a sombra direita se a distância até o final for maior que o threshold
        const maxScrollLeft = element.scrollWidth - element.clientWidth
        const distanceToEnd = maxScrollLeft - element.scrollLeft

        setShowRightShadow(distanceToEnd > threshold)
      } else {
        // Se não houver overflow, esconde ambas as sombras
        setShowLeftShadow(false)
        setShowRightShadow(false)
      }
    }

    // Verifica o estado inicial assim que o componente é montado
    checkScroll()

    // Adiciona ouvinte com { passive: true } para não impactar performance de rolagem
    element.addEventListener('scroll', checkScroll, { passive: true })

    // Usa ResizeObserver para atualizar estado caso o container mude de tamanho
    const resizeObserver = new ResizeObserver(checkScroll)
    resizeObserver.observe(element)

    // Função de limpeza
    return () => {
      element.removeEventListener('scroll', checkScroll)
      resizeObserver.unobserve(element)
    }
  }, [element, threshold])

  // Funções utilitárias de navegação programática
  const scrollToNext = useCallback(
    (amount?: number) => {
      if (!element) return
      const step = amount ?? element.clientWidth * 0.75
      element.scrollBy({ left: step, behavior: 'smooth' })
    },
    [element],
  )

  const scrollToPrev = useCallback(
    (amount?: number) => {
      if (!element) return
      const step = amount ?? element.clientWidth * 0.75
      element.scrollBy({ left: -step, behavior: 'smooth' })
    },
    [element],
  )

  const scrollToStart = useCallback(() => {
    if (!element) return
    element.scrollTo({ left: 0, behavior: 'smooth' })
  }, [element])

  const scrollToEnd = useCallback(() => {
    if (!element) return
    element.scrollTo({ left: element.scrollWidth, behavior: 'smooth' })
  }, [element])

  return {
    scrollRef,
    showLeftShadow,
    showRightShadow,
    element,
    scrollToNext,
    scrollToPrev,
    scrollToStart,
    scrollToEnd,
  }
}
