'use client'

import { RefObject, useEffect, useState } from 'react'

/**
 * Um hook customizado que monitora um elemento rolável para determinar
 * se as sombras de gradiente (indicadores de scroll) devem ser exibidas
 * na esquerda ou na direita.
 *
 * @param scrollRef A referência (RefObject) para o elemento rolável (ex: uma div com overflow).
 * @param deps Um array de dependências opcionais (como uma lista de itens) que,
 * quando alterado, deve acionar uma nova verificação do estado de scroll.
 * @returns Um objeto com dois booleans: { showLeftShadow, showRightShadow }.
 */
export function useScrollShadows<T extends HTMLElement>(
  scrollRef?: RefObject<T>,
  deps: unknown[] = [],
) {
  const [showLeftShadow, setShowLeftShadow] = useState(false)
  const [showRightShadow, setShowRightShadow] = useState(false)

  useEffect(() => {
    const element = scrollRef?.current
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

    // Verifica o estado inicial
    checkScroll()

    // Adiciona um ouvinte para o evento de scroll no elemento
    element.addEventListener('scroll', checkScroll, { passive: true })

    // Usa um ResizeObserver para re-verificar caso o tamanho do container mude
    const resizeObserver = new ResizeObserver(checkScroll)
    resizeObserver.observe(element)

    // Função de limpeza para remover os ouvintes
    return () => {
      element.removeEventListener('scroll', checkScroll)
      resizeObserver.unobserve(element)
    }
    // A dependência 'deps' garante que a verificação seja refeita se os itens ou outras variáveis mudarem
  }, [scrollRef, ...deps])

  return { showLeftShadow, showRightShadow }
}
