'use client'

import { useCallback, useEffect, useState } from 'react'
import { useHorizontalScroll } from './use-horizontal-scroll'

export function useHorizontalScrollWithOverlay<T extends HTMLElement>() {
  const scrollRefCallback = useHorizontalScroll<T>()
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
        // Mostra a sombra esquerda se o scroll passou do início (com tolerância de 2px)
        setShowLeftShadow(element.scrollLeft > 2)

        // Mostra a sombra direita se a distância até o final for maior que 2px
        const maxScrollLeft = element.scrollWidth - element.clientWidth
        const isAtEnd = Math.abs(element.scrollLeft - maxScrollLeft) <= 2

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
  }, [element])

  return { scrollRef, showLeftShadow, showRightShadow }
}
