import type { ScheduleTime } from '@/types/class'
import { Clock } from 'lucide-react'

export function TimePill({ time }: { time: ScheduleTime }) {
  return (
    <div
      key={time.id}
      className="bg-accent/50 border-border flex h-8 w-fit shrink-0 items-center gap-1 rounded-full border px-2"
    >
      <Clock className="text-foreground/70 size-4" />

      <span className="text-sm font-semibold">{time.day}</span>

      <span className="text-foreground/95 text-sm font-normal">
        {`${time.startTime}-${time.endTime}`}
      </span>
    </div>
  )
}
