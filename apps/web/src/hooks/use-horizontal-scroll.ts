'use client'

import { useCallback, useRef } from 'react'

export interface HorizontalScrollOptions {
  /**
   * Se a conversão do scroll da roda do mouse em rolagem horizontal está ativada.
   * @default true
   */
  enabled?: boolean

  /**
   * Modo de rolagem:
   * - 'auto': detecta automaticamente se o container tem snap (`snap-x` / `scrollSnapType`).
   *           Se tiver snap, avança suavemente por cards respeitando os snap points nativos.
   *           Caso contrário, aplica rolagem contínua fluida.
   * - 'snap': avança ou retrocede de card em card (ou item em item) suavemente.
   * - 'smooth': rolagem contínua suave com interpolação calibrada por tempo.
   * - 'native': não intercepta a roda do mouse, mantendo o comportamento nativo do navegador.
   * @default 'auto'
   */
  mode?: 'auto' | 'snap' | 'smooth' | 'native'

  /**
   * Sensibilidade ou multiplicador de velocidade no modo smooth.
   * @default 1
   */
  speed?: number

  /**
   * Libera o scroll vertical nativo da página quando o container atingir o início ou o fim,
   * impedindo que o usuário fique travado no container (scroll-trapping / scroll-jacking).
   * @default true
   */
  releaseVerticalScrollAtBoundaries?: boolean
}

export function useHorizontalScroll<T extends HTMLElement>(
  options: HorizontalScrollOptions = {},
) {
  const {
    enabled = true,
    mode = 'auto',
    speed = 1,
    releaseVerticalScrollAtBoundaries = true,
  } = options

  const cleanupRef = useRef<(() => void) | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const targetScrollRef = useRef<number>(0)
  const isAnimatingRef = useRef(false)
  const lastSnapTimeRef = useRef(0)

  const ref = useCallback(
    (node: T | null) => {
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

      if (node && enabled && mode !== 'native') {
        const onWheel = (event: WheelEvent) => {
          // Só intercepta se houver conteúdo transbordando horizontalmente
          if (node.scrollWidth <= node.clientWidth) return

          // Se o usuário estiver fazendo rolagem horizontal com trackpad ou mouse horizontal,
          // deixa a rolagem nativa de hardware agir sem interceptação
          if (
            Math.abs(event.deltaX) >= Math.abs(event.deltaY) &&
            Math.abs(event.deltaX) > 0
          ) {
            return
          }

          // Se a rolagem for primariamente vertical:
          if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
            const direction = event.deltaY > 0 ? 1 : -1
            const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth)

            // Evita scroll-trapping: quando estiver no limite e o usuário continuar rolando na mesma direção,
            // permite que a página role verticalmente com naturalidade
            if (releaseVerticalScrollAtBoundaries) {
              const isAtStart = node.scrollLeft <= 2
              const isAtEnd = node.scrollLeft >= maxScroll - 2

              if ((direction < 0 && isAtStart) || (direction > 0 && isAtEnd)) {
                return
              }
            }

            event.preventDefault()

            // Detecta se o container usa CSS scroll snap
            const computedSnap = window.getComputedStyle(node).scrollSnapType
            const hasSnapClass =
              node.classList.contains('snap-x') ||
              (computedSnap && computedSnap !== 'none')

            const isSnapMode =
              mode === 'snap' || (mode === 'auto' && hasSnapClass)

            if (isSnapMode) {
              // Modo Snap amigável a carrosséis de cards
              const now = performance.now()
              // Cooldown de 160ms para evitar que múltiplos ticks de mouse wheel pulem vários cards
              if (now - lastSnapTimeRef.current < 160) {
                return
              }
              lastSnapTimeRef.current = now

              // Calcula o passo de rolagem com base nos itens filhos
              const children = Array.from(node.children) as HTMLElement[]
              let step = 0

              if (children.length > 0) {
                // Tenta encontrar o próximo elemento no sentido do scroll
                const currentScroll = node.scrollLeft
                const containerOffset = node.offsetLeft

                if (direction > 0) {
                  // Indo para a direita: busca o primeiro elemento cujo offset seja maior que o scroll atual
                  const nextChild = children.find(
                    (child) =>
                      child.offsetLeft - containerOffset > currentScroll + 10,
                  )
                  if (nextChild) {
                    step =
                      nextChild.offsetLeft - containerOffset - currentScroll
                  }
                } else {
                  // Indo para a esquerda: busca o elemento anterior
                  const prevChild = [...children]
                    .reverse()
                    .find(
                      (child) =>
                        child.offsetLeft - containerOffset < currentScroll - 10,
                    )
                  if (prevChild) {
                    step =
                      prevChild.offsetLeft - containerOffset - currentScroll
                  }
                }

                // Fallback para a largura do primeiro card ou largura padrão
                if (!step) {
                  const firstCardWidth = children[0]?.offsetWidth || 300
                  step = direction * firstCardWidth
                }
              } else {
                step = direction * Math.min(320, node.clientWidth * 0.8)
              }

              node.scrollBy({
                left: step,
                behavior: 'smooth',
              })
              return
            }

            // Modo Contínuo Suave (smooth)
            // Normaliza o delta de acordo com o deltaMode
            let delta = event.deltaY
            if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
              delta *= 33
            } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
              delta *= node.clientHeight
            }
            delta *= speed

            if (!isAnimatingRef.current) {
              targetScrollRef.current = node.scrollLeft
            }

            targetScrollRef.current = Math.max(
              0,
              Math.min(targetScrollRef.current + delta, maxScroll),
            )

            if (!isAnimatingRef.current) {
              isAnimatingRef.current = true
              let lastTime = performance.now()

              const animate = (currentTime: number) => {
                if (!node) {
                  isAnimatingRef.current = false
                  return
                }

                const dt = Math.min((currentTime - lastTime) / 1000, 0.1)
                lastTime = currentTime

                const current = node.scrollLeft
                const target = targetScrollRef.current
                const diff = target - current

                // Finaliza se a diferença for imperceptível
                if (Math.abs(diff) < 0.75) {
                  node.scrollLeft = target
                  isAnimatingRef.current = false
                  animationFrameRef.current = null
                  return
                }

                // Amortecimento exponencial independente da taxa de atualização do monitor
                // Fator de fricção ~15s^-1 dá uma desaceleração natural e ágil
                const factor = 1 - Math.exp(-15 * dt)
                node.scrollLeft = current + diff * factor

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
    },
    [enabled, mode, speed, releaseVerticalScrollAtBoundaries],
  )

  return ref
}
