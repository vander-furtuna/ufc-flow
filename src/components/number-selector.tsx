'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

type NumberSelectorProps = {
  startNumber?: number
  endNumber?: number
  initialNumber?: number
  onNumberChange?: (number: number) => void
}

export default function NumberSelector({
  startNumber = 0,
  endNumber = 100,
  initialNumber = 50,
  onNumberChange,
}: NumberSelectorProps) {
  const [selectedNumber, setSelectedNumber] = useState(initialNumber)

  const containerRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>(null)

  const [touchStart, setTouchStart] = useState<{
    y: number
    time: number
  } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ y: number; time: number } | null>(
    null,
  )
  const [isDragging, setIsDragging] = useState(false)

  // Gerar array de anos
  const numbers = Array.from(
    { length: endNumber - startNumber + 1 },
    (_, i) => startNumber + i,
  )
  const selectedIndex = numbers.indexOf(selectedNumber)

  // Função para mudar o ano
  const changeNumber = useCallback(
    (newNumber: number) => {
      if (newNumber >= startNumber && newNumber <= endNumber) {
        setSelectedNumber(newNumber)
        onNumberChange?.(newNumber)
      }
    },
    [startNumber, endNumber, onNumberChange],
  )

  // Navegação com botões
  const goUp = useCallback(
    () => changeNumber(selectedNumber + 1),
    [selectedNumber, changeNumber],
  )
  const goDown = useCallback(
    () => changeNumber(selectedNumber - 1),
    [selectedNumber, changeNumber],
  )

  // Handle scroll
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      if (e.deltaY > 0) {
        goDown()
      } else {
        goUp()
      }
    },
    [goDown, goUp],
  )

  // Configurações de touch
  const minSwipeDistance = 30
  const maxSwipeTime = 300

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ y: touch.clientY, time: Date.now() })
    setTouchEnd(null)
    setIsDragging(true)
  }, [])

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart) return

      const touch = e.touches[0]
      setTouchEnd({ y: touch.clientY, time: Date.now() })

      // Prevenir scroll da página durante o swipe
      e.preventDefault()
    },
    [touchStart],
  )

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) {
      setIsDragging(false)
      return
    }

    const distance = touchStart.y - touchEnd.y
    const time = touchEnd.time - touchStart.time
    const isValidSwipe =
      Math.abs(distance) > minSwipeDistance && time < maxSwipeTime

    if (isValidSwipe) {
      if (distance > 0) {
        // Swipe up - próximo ano
        goUp()
      } else {
        // Swipe down - ano anterior
        goDown()
      }
    }

    setTouchStart(null)
    setTouchEnd(null)
    setIsDragging(false)
  }, [touchStart, touchEnd, goUp, goDown])

  // Handle touch cancel
  const handleTouchCancel = useCallback(() => {
    setTouchStart(null)
    setTouchEnd(null)
    setIsDragging(false)
  }, [])

  useEffect(() => {
    const container = containerRef.current

    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => container.removeEventListener('wheel', handleWheel)
    }
  }, [selectedNumber, handleWheel])

  // Cleanup timeout
  useEffect(() => {
    const timeout = scrollTimeoutRef.current

    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [])

  // Calcular anos visíveis (5 acima e 5 abaixo do selecionado)
  const getVisibleYears = () => {
    const visibleRange = 5
    const startIndex = Math.max(0, selectedIndex - visibleRange)
    const endIndex = Math.min(numbers.length - 1, selectedIndex + visibleRange)

    return numbers.slice(startIndex, endIndex + 1).map((number, index) => {
      const actualIndex = startIndex + index
      const distanceFromCenter = Math.abs(actualIndex - selectedIndex)
      return { number, distanceFromCenter, actualIndex }
    })
  }

  const visibleNumbers = getVisibleYears()

  return (
    <div className="flex w-fit flex-col items-center justify-center gap-4">
      {/* Botões de navegação */}
      <div className="relative my-12">
        {/* Botão para cima */}
        <motion.button
          onClick={goDown}
          disabled={selectedNumber <= startNumber}
          className="bg-accent/80 hover:bg-accent absolute -top-12 left-1/2 z-10 -translate-x-1/2 transform rounded-md border p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronUp className="text-accent-foreground h-6 w-6" />
        </motion.button>

        {/* Container da roleta */}
        <div
          ref={containerRef}
          className={`relative h-56 w-24 cursor-pointer overflow-hidden transition-transform duration-200 select-none ${
            isDragging ? 'scale-105' : ''
          }`}
          style={{ perspective: '1000px' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          {/* Indicador central */}
          <div className="border-accent-foreground/60 pointer-events-none absolute inset-x-0 top-1/2 z-10 h-12 -translate-y-1/2 transform rounded-md border-2" />

          {/* Números */}
          <div className="relative flex h-full flex-col items-center justify-center">
            <AnimatePresence mode="popLayout">
              {visibleNumbers.map(
                ({ number, distanceFromCenter, actualIndex }) => {
                  const isSelected = distanceFromCenter === 0
                  const opacity = Math.max(0.2, 1 - distanceFromCenter * 0.3)
                  const scale = Math.max(0.6, 1 - distanceFromCenter * 0.15)
                  const yOffset = (actualIndex - selectedIndex) * 48
                  const rotateX = (actualIndex - selectedIndex) * 15

                  return (
                    <motion.div
                      key={number}
                      className={`absolute flex h-12 w-full cursor-pointer items-center justify-center text-2xl font-bold transition-colors duration-200 ${
                        isSelected
                          ? 'text-accent-foreground'
                          : 'text-accent-foreground/60 hover:text-accent-foreground/80'
                      }`}
                      style={{
                        opacity,
                        transformStyle: 'preserve-3d',
                      }}
                      animate={{
                        y: yOffset,
                        scale,
                        rotateX,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                      }}
                      onClick={() => changeNumber(number)}
                      whileHover={{ scale: scale * 1.05 }}
                    >
                      {number}
                    </motion.div>
                  )
                },
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Botão para baixo */}
        <motion.button
          onClick={goUp}
          disabled={selectedNumber >= endNumber}
          className="bg-accent/80 hover:bg-accent absolute -bottom-12 left-1/2 z-10 -translate-x-1/2 transform rounded-md border p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronDown className="text-accent-foreground h-6 w-6" />
        </motion.button>
      </div>

      <div className="flex flex-col items-center justify-center gap-1">
        <span className="text-accent-foreground text-sm">Periodo</span>
        <div className="bg-accent flex h-12 w-16 items-center justify-center rounded-lg border">
          <span className="text-accent-foreground text-xl font-bold">
            {selectedNumber}
          </span>
        </div>
      </div>
    </div>
  )
}
