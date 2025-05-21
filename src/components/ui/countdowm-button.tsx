'use client'

import dayjs from 'dayjs'
import { Info } from 'lucide-react'
import { type ComponentProps, useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
interface CountdownButtonProps extends ComponentProps<'button'> {}

export function CountdownButton({ className, ...rest }: CountdownButtonProps) {
  const [seconds, setSeconds] = useState(0)
  const [minutes, setMinutes] = useState(0)
  const [hours, setHours] = useState(0)
  const [days, setDays] = useState(0)

  const finalDate = useMemo(() => new Date(2025, 4, 22, 12, 0, 0, 0), [])

  const finalSeconds = useMemo(() => seconds % 60, [seconds])
  const finalMinutes = useMemo(() => Math.floor(minutes % 60), [minutes])
  const finalHours = useMemo(() => Math.floor(hours % 24), [hours])

  const secondsString = String(finalSeconds).padStart(2, '0')
  const minutesString = String(finalMinutes).padStart(2, '0')
  const hoursString = String(finalHours).padStart(2, '0')

  const clockString = `${days} dias e ${hoursString}:${minutesString}:${secondsString}`

  useEffect(() => {
    const interval = setInterval(() => {
      const currentDate = dayjs(new Date()).isBefore(finalDate)
        ? new Date()
        : finalDate

      const differenceInSeconds = dayjs(finalDate).diff(currentDate, 'seconds')
      const minutes = differenceInSeconds / 60
      const hours = minutes / 60
      const days = Math.floor(hours / 24)

      setSeconds(differenceInSeconds)
      setMinutes(minutes)
      setHours(hours)
      setDays(days)
    })

    return () => {
      clearInterval(interval)
    }
  }, [finalDate])

  return (
    <div className="animate-border w-full rounded-md border-2 border-transparent [background:linear-gradient(45deg,theme(colors.slate.100),theme(colors.slate.100)_50%,theme(colors.slate.100))_padding-box,conic-gradient(from_var(--border-angle),theme(colors.slate.200/.48)_80%,_theme(colors.amber.500)_86%,_theme(colors.emerald.300)_90%,_theme(colors.sky.500)_94%,_theme(colors.slate.600/.48))_border-box] dark:[background:linear-gradient(45deg,theme(colors.slate.900),theme(colors.slate.900)_50%,theme(colors.slate.900))_padding-box,conic-gradient(from_var(--border-angle),theme(colors.slate.700/.48)_80%,_theme(colors.amber.500)_86%,_theme(colors.emerald.300)_90%,_theme(colors.sky.500)_94%,_theme(colors.slate.200/.48))_border-box]">
      <button
        className={cn(
          'card-content flex h-full items-center justify-center gap-2 px-3 text-xs',
          className,
        )}
        {...rest}
      >
        <Info className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        <div className="flex flex-col items-start">
          <span>UFC Flow dirá ADEUS em</span>
          <strong className="text-base">{clockString}</strong>
        </div>
      </button>
    </div>
  )
}
