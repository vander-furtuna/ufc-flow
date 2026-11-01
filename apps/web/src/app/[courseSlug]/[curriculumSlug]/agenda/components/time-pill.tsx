import type { ScheduleTime } from '@/types/class'
import { ClockIcon } from '@phosphor-icons/react'

export function TimePill({ time }: { time: ScheduleTime }) {
  return (
    <div
      key={time.id}
      className="flex h-8 w-fit shrink-0 items-center gap-1 rounded-full border border-border bg-accent/50 px-2"
    >
      <ClockIcon weight="bold" className="size-4 text-foreground/70" />

      <span className="text-sm font-semibold">{time.day}</span>

      <span className="text-sm font-normal text-foreground/95">
        {`${time.startTime}-${time.endTime}`}
      </span>
    </div>
  )
}
