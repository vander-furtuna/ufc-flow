// src/hooks/use-horizontal-scroll.ts
import { useCallback, useRef } from 'react'

export function useHorizontalScroll<T extends HTMLElement>() {
  const cleanupRef = useRef<(() => void) | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const targetScrollRef = useRef<number>(0)
  const isAnimatingRef = useRef(false)

  const ref = useCallback((node: T | null) => {
    // Limpa listener e animação anterior
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
      isAnimatingRef.current = false
    }

    if (node) {
      const onWheel = (event: WheelEvent) => {
        // Só intercepta se tiver conteúdo pra rolar
        if (node.scrollWidth <= node.clientWidth) return

        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
          event.preventDefault()

          // Se não estava animando, sincroniza o alvo com a posição atual real
          if (!isAnimatingRef.current) {
            targetScrollRef.current = node.scrollLeft
          }

          // Acumula o delta no alvo
          targetScrollRef.current += event.deltaY

          // Limita o alvo aos limites do container
          // Adicionamos uma tolerância nos dois limites para garantir que chegue ao fim/início
          // mesmo com arredondamentos de sub-pixel ou diferenças de cálculo
          const maxScroll = node.scrollWidth - node.clientWidth
          targetScrollRef.current = Math.max(
            -50,
            Math.min(targetScrollRef.current, maxScroll + 50),
          )

          // Inicia o loop de animação se necessário
          if (!isAnimatingRef.current) {
            isAnimatingRef.current = true

            const animate = () => {
              if (!node) {
                isAnimatingRef.current = false
                return
              }

              const current = node.scrollLeft
              const target = targetScrollRef.current
              const diff = target - current

              // Se chegou perto o suficiente, finaliza
              if (Math.abs(diff) < 1) {
                node.scrollLeft = target
                isAnimatingRef.current = false
                animationFrameRef.current = null
                return
              }

              // Aplica interpolação
              const nextPos = current + diff * 0.15
              node.scrollLeft = nextPos

              // Verifica se atingiu uma parede (o scroll não mudou apesar da tentativa)
              // Isso acontece quando o target ultrapassa o limite real do container
              if (
                Math.abs(node.scrollLeft - current) < 0.1 &&
                Math.abs(diff) > 2
              ) {
                isAnimatingRef.current = false
                animationFrameRef.current = null
                // Ajusta o target para a posição real onde parou
                targetScrollRef.current = node.scrollLeft
                return
              }

              animationFrameRef.current = requestAnimationFrame(animate)
            }

            animationFrameRef.current = requestAnimationFrame(animate)
          }
        }
      }

      node.addEventListener('wheel', onWheel, { passive: false })

      cleanupRef.current = () => {
        node.removeEventListener('wheel', onWheel)
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }
    }
  }, [])

  return ref
}
